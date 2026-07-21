import "server-only"

import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"
import { createPaymentWebhookInboxId } from "@/modules/payments/server/ids"
import {
  defaultPaymentWebhookInboxRepository,
  type PaymentWebhookInboxRepository,
} from "@/modules/payments/server/webhook-inbox-repository"
import {
  getPayPalWebhookEventId,
  getPayPalWebhookEventType,
  getPayPalWebhookProviderCaptureId,
  getPayPalWebhookProviderOrderId,
  verifyPayPalWebhookSignature,
  type PayPalWebhookEvent,
} from "@/modules/payments/server/providers/paypal/webhook"

interface PayPalWebhookDeps {
  inboxRepository: PaymentWebhookInboxRepository
  processEvent: (input: { event: PayPalWebhookEvent }) => Promise<void>
}

const defaultDeps: PayPalWebhookDeps = {
  inboxRepository: defaultPaymentWebhookInboxRepository,
  async processEvent() {
    throw new Error("No PayPal webhook processor configured.")
  },
}

export async function verifyAndStorePayPalWebhook(input: {
  headers: Headers
  event: PayPalWebhookEvent
  deps?: Partial<PayPalWebhookDeps>
}) {
  const verified = await verifyPayPalWebhookSignature({
    headers: input.headers,
    event: input.event,
  })

  if (!verified) {
    return { ok: false as const, reason: "verification_failed" }
  }

  const providerEventId = getPayPalWebhookEventId(input.event)

  if (!providerEventId) {
    return { ok: false as const, reason: "missing_event_id" }
  }

  const deps = { ...defaultDeps, ...input.deps }
  const inbox = await deps.inboxRepository.storeReceived({
    id: createPaymentWebhookInboxId(),
    provider: "paypal",
    providerEventId,
    eventType: getPayPalWebhookEventType(input.event),
    providerOrderId: getPayPalWebhookProviderOrderId(input.event),
    providerCaptureId: getPayPalWebhookProviderCaptureId(input.event),
    payload: input.event,
    headers: Object.fromEntries(input.headers.entries()),
  })

  logFlightFlow("payments.paypal", "webhook_stored", {
    inboxId: inbox.id,
    providerEventId: inbox.providerEventId,
    eventType: inbox.eventType,
  })

  return { ok: true as const, inbox }
}

export async function processPayPalWebhookInbox(input: {
  limit?: number
  now?: Date
  workerId?: string
  deps?: Partial<PayPalWebhookDeps>
} = {}) {
  const deps = { ...defaultDeps, ...input.deps }
  const now = input.now ?? new Date()
  const workerId = input.workerId ?? createPaymentWebhookWorkerId()
  const records = await deps.inboxRepository.findReady(now, input.limit ?? 10)
  let processed = 0
  let failed = 0
  let ignored = 0

  for (const record of records) {
    const claimNow = new Date()
    const claimedRecord = await deps.inboxRepository.claimReady({
      id: record.id,
      workerId,
      now: claimNow,
      leaseExpiresAt: new Date(claimNow.getTime() + webhookLeaseMs()),
    })

    if (!claimedRecord) {
      ignored += 1
      continue
    }

    try {
      await deps.processEvent({ event: claimedRecord.payload as PayPalWebhookEvent })
      await deps.inboxRepository.markProcessed({
        id: claimedRecord.id,
        workerId,
        now: new Date(),
      })
      processed += 1
    } catch (error) {
      failed += 1
      const nextAttemptAt = new Date(
        Date.now() + retryDelayMs(claimedRecord.attemptCount + 1)
      )
      await deps.inboxRepository.markFailed({
        id: claimedRecord.id,
        workerId,
        lastError: error instanceof Error ? error.message : "Unknown webhook worker error",
        nextAttemptAt,
      })
      logFlightFlowError("payments.paypal", "webhook_worker_failed", error, {
        inboxId: claimedRecord.id,
        providerEventId: claimedRecord.providerEventId,
      })
    }
  }

  return {
    claimed: records.length,
    processed,
    failed,
    ignored,
  }
}

function retryDelayMs(attemptCount: number) {
  return Math.min(60_000 * 2 ** Math.max(attemptCount - 1, 0), 15 * 60_000)
}

function webhookLeaseMs() {
  return 60_000
}

function createPaymentWebhookWorkerId() {
  return `payment-worker:webhook:${Date.now()}:${Math.random().toString(36).slice(2)}`
}
