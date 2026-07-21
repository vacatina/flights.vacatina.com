import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  defaultPaymentAttemptsRepository,
  resetInMemoryPaymentAttemptsForTests,
} from "@/modules/payments/server/attempts-repository"
import {
  defaultPaymentEventsRepository,
  resetInMemoryPaymentEventsForTests,
} from "@/modules/payments/server/events-repository"
import {
  defaultPaymentOutboxRepository,
  resetInMemoryPaymentOutboxForTests,
} from "@/modules/payments/server/outbox-repository"
import {
  defaultPaymentWebhookInboxRepository,
  resetInMemoryPaymentWebhookInboxForTests,
} from "@/modules/payments/server/webhook-inbox-repository"

beforeEach(() => {
  delete process.env.DATABASE_URL
  resetInMemoryPaymentAttemptsForTests()
  resetInMemoryPaymentEventsForTests()
  resetInMemoryPaymentWebhookInboxForTests()
  resetInMemoryPaymentOutboxForTests()
})

describe("payment attempts repository", () => {
  test("fails closed outside tests when payment persistence is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production")

    try {
      await expect(
        defaultPaymentAttemptsRepository.createOrFindByIdempotency(
          createAttemptInput({ id: "pat_no_db" })
        )
      ).rejects.toThrow("Payment persistence is unavailable.")
    } finally {
      vi.unstubAllEnvs()
    }
  })

  test("reuses attempts by internal idempotency key", async () => {
    const first = await defaultPaymentAttemptsRepository.createOrFindByIdempotency(
      createAttemptInput({ id: "pat_first" })
    )
    const second = await defaultPaymentAttemptsRepository.createOrFindByIdempotency(
      createAttemptInput({ id: "pat_second" })
    )

    expect(second.id).toBe(first.id)
    expect(second.createIdempotencyKey).toBe("create_key_1")
  })

  test("updates current-state fields without losing original idempotency", async () => {
    const attempt = await defaultPaymentAttemptsRepository.createOrFindByIdempotency(
      createAttemptInput({ id: "pat_update" })
    )

    const updated = await defaultPaymentAttemptsRepository.update(attempt.id, {
      status: "provider_order_created",
      providerOrderId: "PAYPAL-ORDER-1",
      providerStatus: "CREATED",
      lastProviderPayload: { id: "PAYPAL-ORDER-1" },
    })

    expect(updated?.status).toBe("provider_order_created")
    expect(updated?.providerOrderId).toBe("PAYPAL-ORDER-1")
    expect(updated?.clientIdempotencyKey).toBe("client_key_1")
  })
})

describe("payment events repository", () => {
  test("keeps immutable attempt timeline in append order", async () => {
    await defaultPaymentEventsRepository.append({
      id: "pev_1",
      paymentAttemptId: "pat_1",
      eventType: "PAYMENT_INITIATED",
      provider: "paypal",
      amount: 120,
      currency: "USD",
    })
    await defaultPaymentEventsRepository.append({
      id: "pev_2",
      paymentAttemptId: "pat_1",
      eventType: "PROVIDER_ORDER_CREATED",
      provider: "paypal",
      providerOrderId: "PAYPAL-ORDER-1",
    })

    const events = await defaultPaymentEventsRepository.listByAttemptId("pat_1")

    expect(events.map((event) => event.eventType)).toEqual([
      "PAYMENT_INITIATED",
      "PROVIDER_ORDER_CREATED",
    ])
  })

  test("deduplicates provider event records", async () => {
    const first = await defaultPaymentEventsRepository.append({
      id: "pev_first",
      paymentAttemptId: "pat_1",
      eventType: "WEBHOOK_RECEIVED",
      provider: "paypal",
      providerEventId: "WH-1",
    })
    const second = await defaultPaymentEventsRepository.append({
      id: "pev_second",
      paymentAttemptId: "pat_1",
      eventType: "WEBHOOK_RECEIVED",
      provider: "paypal",
      providerEventId: "WH-1",
    })

    expect(second.id).toBe(first.id)
    await expect(defaultPaymentEventsRepository.listByAttemptId("pat_1")).resolves.toHaveLength(
      1
    )
  })
})

describe("payment webhook inbox repository", () => {
  test("stores duplicate provider webhook events once", async () => {
    const first = await defaultPaymentWebhookInboxRepository.storeReceived({
      id: "pwi_first",
      provider: "paypal",
      providerEventId: "WH-1",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      providerOrderId: "PAYPAL-ORDER-1",
      providerCaptureId: "PAYPAL-CAPTURE-1",
      payload: { id: "WH-1" },
    })
    const second = await defaultPaymentWebhookInboxRepository.storeReceived({
      id: "pwi_second",
      provider: "paypal",
      providerEventId: "WH-1",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
    })

    expect(second.id).toBe(first.id)
    expect(second.providerOrderId).toBe("PAYPAL-ORDER-1")
  })

  test("finds retryable inbox records", async () => {
    const now = new Date("2099-01-01T00:00:00.000Z")
    await defaultPaymentWebhookInboxRepository.storeReceived({
      id: "pwi_ready",
      provider: "paypal",
      providerEventId: "WH-READY",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
    })

    const ready = await defaultPaymentWebhookInboxRepository.findReady(now, 10)

    expect(ready).toHaveLength(1)
    expect(ready[0]?.id).toBe("pwi_ready")
  })

  test("does not return processed inbox records as retryable", async () => {
    const now = new Date("2099-01-01T00:00:00.000Z")
    const inbox = await defaultPaymentWebhookInboxRepository.storeReceived({
      id: "pwi_processed",
      provider: "paypal",
      providerEventId: "WH-PROCESSED",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
    })

    const claimed = await defaultPaymentWebhookInboxRepository.claimReady({
      id: inbox.id,
      workerId: "worker_a",
      now,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    })

    expect(claimed?.claimedBy).toBe("worker_a")

    await defaultPaymentWebhookInboxRepository.markProcessed({
      id: inbox.id,
      workerId: "worker_a",
      now,
    })

    await expect(defaultPaymentWebhookInboxRepository.findReady(now, 10)).resolves.toEqual([])
  })

  test("allows only one worker to claim a webhook inbox record", async () => {
    const now = new Date("2099-01-01T00:00:00.000Z")
    const inbox = await defaultPaymentWebhookInboxRepository.storeReceived({
      id: "pwi_claim_once",
      provider: "paypal",
      providerEventId: "WH-CLAIM",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
    })

    const first = await defaultPaymentWebhookInboxRepository.claimReady({
      id: inbox.id,
      workerId: "worker_a",
      now,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    })
    const second = await defaultPaymentWebhookInboxRepository.claimReady({
      id: inbox.id,
      workerId: "worker_b",
      now,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    })

    expect(first?.claimedBy).toBe("worker_a")
    expect(second).toBeNull()
  })

  test("returns expired processing webhook records for retry", async () => {
    const firstNow = new Date("2099-01-01T00:00:00.000Z")
    const retryNow = new Date("2099-01-01T00:02:00.000Z")
    const inbox = await defaultPaymentWebhookInboxRepository.storeReceived({
      id: "pwi_expired",
      provider: "paypal",
      providerEventId: "WH-EXPIRED",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
    })

    await defaultPaymentWebhookInboxRepository.claimReady({
      id: inbox.id,
      workerId: "worker_a",
      now: firstNow,
      leaseExpiresAt: new Date(firstNow.getTime() + 60_000),
    })

    const ready = await defaultPaymentWebhookInboxRepository.findReady(retryNow, 10)
    const reclaimed = await defaultPaymentWebhookInboxRepository.claimReady({
      id: inbox.id,
      workerId: "worker_b",
      now: retryNow,
      leaseExpiresAt: new Date(retryNow.getTime() + 60_000),
    })

    expect(ready.map((record) => record.id)).toContain(inbox.id)
    expect(reclaimed?.claimedBy).toBe("worker_b")
  })
})

describe("payment outbox repository", () => {
  test("enqueues unique fulfillment tasks once", async () => {
    const first = await defaultPaymentOutboxRepository.enqueueUnique({
      id: "pob_first",
      taskType: "fulfill_flight_order",
      uniqueKey: "fulfill:pat_1",
      paymentAttemptId: "pat_1",
      internalOrderType: "flight_checkout",
      internalOrderId: "chs_1",
    })
    const second = await defaultPaymentOutboxRepository.enqueueUnique({
      id: "pob_second",
      taskType: "fulfill_flight_order",
      uniqueKey: "fulfill:pat_1",
      paymentAttemptId: "pat_1",
      internalOrderType: "flight_checkout",
      internalOrderId: "chs_1",
    })

    expect(second.id).toBe(first.id)
    await expect(defaultPaymentOutboxRepository.findPending(new Date(), 10)).resolves.toHaveLength(
      1
    )
  })

  test("requeues transiently failed outbox tasks", async () => {
    const now = new Date("2099-01-01T00:00:00.000Z")
    const workerId = "worker_retry"
    const task = await defaultPaymentOutboxRepository.enqueueUnique({
      id: "pob_retry",
      taskType: "fulfill_flight_order",
      uniqueKey: "fulfill:pat_retry",
      paymentAttemptId: "pat_retry",
      internalOrderType: "flight_checkout",
      internalOrderId: "chs_retry",
    })

    await defaultPaymentOutboxRepository.claimPending({
      id: task.id,
      workerId,
      now,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    })

    await defaultPaymentOutboxRepository.markFailed({
      id: task.id,
      workerId,
      lastError: "Duffel request failed",
      nextAttemptAt: new Date(now.getTime() + 1_000),
    })

    const pending = await defaultPaymentOutboxRepository.findPending(
      new Date(now.getTime() + 1_000),
      10
    )

    expect(pending).toHaveLength(1)
    expect(pending[0]?.attemptCount).toBe(1)
    expect(pending[0]?.lastError).toBe("Duffel request failed")
    expect(pending[0]?.claimedBy).toBeNull()
  })

  test("allows only one worker to claim an outbox task", async () => {
    const now = new Date("2099-01-01T00:00:00.000Z")
    const task = await defaultPaymentOutboxRepository.enqueueUnique({
      id: "pob_claim_once",
      taskType: "fulfill_flight_order",
      uniqueKey: "fulfill:claim_once",
      paymentAttemptId: "pat_claim_once",
      internalOrderType: "flight_checkout",
      internalOrderId: "chs_claim_once",
    })

    const first = await defaultPaymentOutboxRepository.claimPending({
      id: task.id,
      workerId: "worker_a",
      now,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    })
    const second = await defaultPaymentOutboxRepository.claimPending({
      id: task.id,
      workerId: "worker_b",
      now,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    })

    expect(first?.claimedBy).toBe("worker_a")
    expect(second).toBeNull()
  })

  test("allows expired processing outbox tasks to be reclaimed", async () => {
    const firstNow = new Date("2099-01-01T00:00:00.000Z")
    const retryNow = new Date("2099-01-01T00:06:00.000Z")
    const task = await defaultPaymentOutboxRepository.enqueueUnique({
      id: "pob_expired",
      taskType: "fulfill_flight_order",
      uniqueKey: "fulfill:expired",
      paymentAttemptId: "pat_expired",
      internalOrderType: "flight_checkout",
      internalOrderId: "chs_expired",
    })

    await defaultPaymentOutboxRepository.claimPending({
      id: task.id,
      workerId: "worker_a",
      now: firstNow,
      leaseExpiresAt: new Date(firstNow.getTime() + 60_000),
    })

    const reclaimed = await defaultPaymentOutboxRepository.claimPending({
      id: task.id,
      workerId: "worker_b",
      now: retryNow,
      leaseExpiresAt: new Date(retryNow.getTime() + 60_000),
    })

    expect(reclaimed?.claimedBy).toBe("worker_b")
  })

  test("does not let another worker complete a claimed outbox task", async () => {
    const now = new Date("2099-01-01T00:00:00.000Z")
    const task = await defaultPaymentOutboxRepository.enqueueUnique({
      id: "pob_complete_owner",
      taskType: "fulfill_flight_order",
      uniqueKey: "fulfill:complete_owner",
      paymentAttemptId: "pat_complete_owner",
      internalOrderType: "flight_checkout",
      internalOrderId: "chs_complete_owner",
    })

    await defaultPaymentOutboxRepository.claimPending({
      id: task.id,
      workerId: "worker_a",
      now,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    })

    await expect(
      defaultPaymentOutboxRepository.markCompleted({
        id: task.id,
        workerId: "worker_b",
        now,
      })
    ).resolves.toBe(false)

    await expect(
      defaultPaymentOutboxRepository.markCompleted({
        id: task.id,
        workerId: "worker_a",
        now,
      })
    ).resolves.toBe(true)
  })
})

function createAttemptInput(input: { id: string }) {
  return {
    id: input.id,
    internalOrderType: "flight_checkout" as const,
    internalOrderId: "chs_1",
    ownerUserId: "usr_1",
    ownerGuestId: null,
    ownerOrgId: null,
    provider: "paypal" as const,
    currency: "USD",
    amount: 120,
    createIdempotencyKey: "create_key_1",
    captureIdempotencyKey: "capture_key_1",
    clientIdempotencyKey: "client_key_1",
    checkoutPayloadSnapshot: {
      quoteId: "quote_1",
    },
  }
}
