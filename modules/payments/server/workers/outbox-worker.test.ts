import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import type { PayableResourceAdapter } from "@/modules/payments/server/adapters"
import {
  registerPaymentAdapter,
  resetPaymentAdaptersForTests,
} from "@/modules/payments/server/adapters"
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
import { processPaymentOutboxByPaymentAttemptId } from "@/modules/payments/server/workers/outbox-worker"

beforeEach(() => {
  delete process.env.DATABASE_URL
  resetPaymentAdaptersForTests()
  resetInMemoryPaymentAttemptsForTests()
  resetInMemoryPaymentEventsForTests()
  resetInMemoryPaymentOutboxForTests()
})

describe("payment outbox worker adapter routing", () => {
  test("fulfills generic paid resource tasks through the registered adapter", async () => {
    const fulfill = vi.fn(async () => ({
      status: "fulfilled" as const,
      externalOrderId: "ord_1",
    }))
    registerPaymentAdapter(createAdapter(fulfill))
    await createFulfillableAttempt("pat_generic")
    await defaultPaymentOutboxRepository.enqueueUnique({
      id: "pob_generic",
      taskType: "fulfill_paid_resource",
      uniqueKey: "fulfill_paid_resource:pat_generic",
      paymentAttemptId: "pat_generic",
      internalOrderType: "flight_checkout",
      internalOrderId: "chs_generic",
    })

    const result = await processPaymentOutboxByPaymentAttemptId({
      paymentAttemptId: "pat_generic",
      workerId: "worker_generic",
    })

    expect(result.processed).toBe(1)
    expect(fulfill).toHaveBeenCalledWith(
      expect.objectContaining({
        internalOrderId: "chs_generic",
        paymentAttemptId: "pat_generic",
        provider: "paypal",
        providerPaymentId: "PAYPAL-CAPTURE-1",
      })
    )
    await expect(defaultPaymentAttemptsRepository.findById("pat_generic")).resolves.toMatchObject({
      status: "fulfilled",
    })
  })

  test("still drains legacy flight fulfillment tasks through the adapter", async () => {
    const fulfill = vi.fn(async () => ({ status: "fulfilled" as const }))
    registerPaymentAdapter(createAdapter(fulfill))
    await createFulfillableAttempt("pat_legacy")
    await defaultPaymentOutboxRepository.enqueueUnique({
      id: "pob_legacy",
      taskType: "fulfill_flight_order",
      uniqueKey: "fulfill_flight_order:pat_legacy",
      paymentAttemptId: "pat_legacy",
      internalOrderType: "flight_checkout",
      internalOrderId: "chs_legacy",
    })

    const result = await processPaymentOutboxByPaymentAttemptId({
      paymentAttemptId: "pat_legacy",
      workerId: "worker_legacy",
    })

    expect(result.processed).toBe(1)
    expect(fulfill).toHaveBeenCalledOnce()
  })
})

function createAdapter(
  fulfill: PayableResourceAdapter["fulfill"]
): PayableResourceAdapter {
  return {
    resourceType: "flight_checkout",
    fulfill,
  }
}

async function createFulfillableAttempt(id: string) {
  return defaultPaymentAttemptsRepository.createOrFindByIdempotency({
    id,
    internalOrderType: "flight_checkout",
    internalOrderId: id.replace("pat_", "chs_"),
    ownerUserId: "usr_1",
    ownerGuestId: null,
    ownerOrgId: null,
    provider: "paypal",
    status: "capture_completed",
    currency: "USD",
    amount: 120,
    providerOrderId: `PAYPAL-ORDER-${id}`,
    providerCaptureId: "PAYPAL-CAPTURE-1",
    providerStatus: "COMPLETED",
    createIdempotencyKey: `create_${id}`,
    captureIdempotencyKey: `capture_${id}`,
    clientIdempotencyKey: `client_${id}`,
    checkoutPayloadSnapshot: {
      quoteId: "quote_1",
    },
  })
}
