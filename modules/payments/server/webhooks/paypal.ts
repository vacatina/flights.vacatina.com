import "server-only"

import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"
import { incrementCheckoutMetric } from "@/modules/flights/checkout/server/metrics"
import { processPayPalWebhookEvent } from "@/modules/flights/checkout/server/service-core"
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
  processEvent: typeof processPayPalWebhookEvent
}

const defaultDeps: PayPalWebhookDeps = {
  inboxRepository: defaultPaymentWebhookInboxRepository,
  processEvent: processPayPalWebhookEvent,
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

  incrementCheckoutMetric("paypal_webhook_total")
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
  deps?: Partial<PayPalWebhookDeps>
} = {}) {
  const deps = { ...defaultDeps, ...input.deps }
  const now = input.now ?? new Date()
  const records = await deps.inboxRepository.findReady(now, input.limit ?? 10)
  let processed = 0
  let failed = 0

  for (const record of records) {
    await deps.inboxRepository.markProcessing(record.id, new Date())

    try {
      await deps.processEvent({ event: record.payload as PayPalWebhookEvent })
      await deps.inboxRepository.markProcessed(record.id, new Date())
      processed += 1
    } catch (error) {
      failed += 1
      const nextAttemptAt = new Date(Date.now() + retryDelayMs(record.attemptCount + 1))
      await deps.inboxRepository.markFailed({
        id: record.id,
        lastError: error instanceof Error ? error.message : "Unknown webhook worker error",
        nextAttemptAt,
      })
      logFlightFlowError("payments.paypal", "webhook_worker_failed", error, {
        inboxId: record.id,
        providerEventId: record.providerEventId,
      })
    }
  }

  return {
    claimed: records.length,
    processed,
    failed,
  }
}

function retryDelayMs(attemptCount: number) {
  return Math.min(60_000 * 2 ** Math.max(attemptCount - 1, 0), 15 * 60_000)
}
