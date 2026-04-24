import "server-only"

import { and, eq } from "drizzle-orm"

import { getDbClient, paymentWebhookEvents } from "@/lib/db"

interface RecordWebhookEventInput {
  id: string
  provider: string
  eventKey: string
  providerOrderId: string
  providerPaymentId: string | null
  payload: unknown
}

export interface PaymentWebhookEventRepository {
  isProcessed(input: { provider: string; eventKey: string }): Promise<boolean>
  record(input: RecordWebhookEventInput): Promise<void>
}

const inMemoryEventKeys = new Set<string>()

export const defaultPaymentWebhookEventRepository: PaymentWebhookEventRepository = {
  async isProcessed(input) {
    const db = getDbClient()

    if (!db) {
      return inMemoryEventKeys.has(toEventKey(input.provider, input.eventKey))
    }

    const row = await db.query.paymentWebhookEvents.findFirst({
      where: and(
        eq(paymentWebhookEvents.provider, input.provider),
        eq(paymentWebhookEvents.eventKey, input.eventKey)
      ),
      columns: {
        id: true,
      },
    })

    return Boolean(row)
  },

  async record(input) {
    const db = getDbClient()

    if (!db) {
      inMemoryEventKeys.add(toEventKey(input.provider, input.eventKey))
      return
    }

    await db
      .insert(paymentWebhookEvents)
      .values({
        id: input.id,
        provider: input.provider,
        eventKey: input.eventKey,
        providerOrderId: input.providerOrderId,
        providerPaymentId: input.providerPaymentId,
        payload: input.payload,
        processedAt: new Date(),
        createdAt: new Date(),
      })
      .onConflictDoNothing({
        target: [paymentWebhookEvents.provider, paymentWebhookEvents.eventKey],
      })
  },
}

function toEventKey(provider: string, eventKey: string) {
  return `${provider}:${eventKey}`
}

export function resetInMemoryPaymentWebhookEventsForTests() {
  inMemoryEventKeys.clear()
}
