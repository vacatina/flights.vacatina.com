import "server-only"

import { and, asc, eq, inArray, lte } from "drizzle-orm"

import { getDbClient, paymentWebhookInbox } from "@/lib/db"
import type {
  PaymentProvider,
  PaymentWebhookInboxStatus,
} from "@/modules/payments/domain"
import { assertPaymentPersistenceAvailable } from "@/modules/payments/server/repository-runtime"

export interface PaymentWebhookInboxRecord {
  id: string
  provider: PaymentProvider
  providerEventId: string
  eventType: string
  providerOrderId: string | null
  providerCaptureId: string | null
  status: PaymentWebhookInboxStatus
  payload: unknown
  headers: unknown
  attemptCount: number
  lastError: string | null
  receivedAt: Date
  processingStartedAt: Date | null
  processedAt: Date | null
  nextAttemptAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface StorePaymentWebhookInput {
  id: string
  provider: PaymentProvider
  providerEventId: string
  eventType: string
  providerOrderId?: string | null
  providerCaptureId?: string | null
  payload?: unknown
  headers?: unknown
}

export interface PaymentWebhookInboxRepository {
  storeReceived(input: StorePaymentWebhookInput): Promise<PaymentWebhookInboxRecord>
  findByProviderEvent(input: {
    provider: PaymentProvider
    providerEventId: string
  }): Promise<PaymentWebhookInboxRecord | null>
  findReady(now: Date, limit: number): Promise<PaymentWebhookInboxRecord[]>
  markProcessing(id: string, now: Date): Promise<void>
  markProcessed(id: string, now: Date): Promise<void>
  markFailed(input: {
    id: string
    lastError: string
    nextAttemptAt: Date
  }): Promise<void>
}

const inMemoryInbox = new Map<string, PaymentWebhookInboxRecord>()
const inMemoryInboxByProviderEvent = new Map<string, string>()

export const defaultPaymentWebhookInboxRepository: PaymentWebhookInboxRepository = {
  async storeReceived(input) {
    const existing = await this.findByProviderEvent({
      provider: input.provider,
      providerEventId: input.providerEventId,
    })

    if (existing) {
      return existing
    }

    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const record: PaymentWebhookInboxRecord = {
        id: input.id,
        provider: input.provider,
        providerEventId: input.providerEventId,
        eventType: input.eventType,
        providerOrderId: input.providerOrderId ?? null,
        providerCaptureId: input.providerCaptureId ?? null,
        status: "received",
        payload: input.payload ?? null,
        headers: input.headers ?? null,
        attemptCount: 0,
        lastError: null,
        receivedAt: now,
        processingStartedAt: null,
        processedAt: null,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      }
      inMemoryInbox.set(record.id, record)
      inMemoryInboxByProviderEvent.set(toProviderEventKey(record), record.id)
      return record
    }

    const [inserted] = await db
      .insert(paymentWebhookInbox)
      .values({
        id: input.id,
        provider: input.provider,
        providerEventId: input.providerEventId,
        eventType: input.eventType,
        providerOrderId: input.providerOrderId ?? null,
        providerCaptureId: input.providerCaptureId ?? null,
        status: "received",
        payload: input.payload ?? null,
        headers: input.headers ?? null,
        attemptCount: 0,
        lastError: null,
        receivedAt: now,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [paymentWebhookInbox.provider, paymentWebhookInbox.providerEventId],
      })
      .returning()

    if (inserted) {
      return toInboxRecord(inserted)
    }

    const afterConflict = await this.findByProviderEvent({
      provider: input.provider,
      providerEventId: input.providerEventId,
    })

    if (!afterConflict) {
      throw new Error("Payment webhook inbox lookup failed after conflict.")
    }

    return afterConflict
  },

  async findByProviderEvent(input) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const id = inMemoryInboxByProviderEvent.get(toProviderEventKey(input))
      return id ? inMemoryInbox.get(id) ?? null : null
    }

    const row = await db.query.paymentWebhookInbox.findFirst({
      where: and(
        eq(paymentWebhookInbox.provider, input.provider),
        eq(paymentWebhookInbox.providerEventId, input.providerEventId)
      ),
    })
    return row ? toInboxRecord(row) : null
  },

  async findReady(now, limit) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      return Array.from(inMemoryInbox.values())
        .filter(
          (record) =>
            (record.status === "received" || record.status === "failed") &&
            record.nextAttemptAt <= now
        )
        .sort((left, right) => left.receivedAt.getTime() - right.receivedAt.getTime())
        .slice(0, limit)
    }

    const rows = await db.query.paymentWebhookInbox.findMany({
      where: and(
        inArray(paymentWebhookInbox.status, ["received", "failed"]),
        lte(paymentWebhookInbox.nextAttemptAt, now)
      ),
      orderBy: [asc(paymentWebhookInbox.receivedAt)],
      limit,
    })
    return rows.map(toInboxRecord)
  },

  async markProcessing(id, now) {
    await updateInboxRecord(id, {
      status: "processing",
      processingStartedAt: now,
      updatedAt: now,
    })
  },

  async markProcessed(id, now) {
    await updateInboxRecord(id, {
      status: "processed",
      processedAt: now,
      updatedAt: now,
    })
  },

  async markFailed(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryInbox.get(input.id)
      if (!current) {
        return
      }
      inMemoryInbox.set(input.id, {
        ...current,
        status: "failed",
        attemptCount: current.attemptCount + 1,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        updatedAt: now,
      })
      return
    }

    const current = await db.query.paymentWebhookInbox.findFirst({
      where: eq(paymentWebhookInbox.id, input.id),
      columns: { attemptCount: true },
    })

    await db
      .update(paymentWebhookInbox)
      .set({
        status: "failed",
        attemptCount: (current?.attemptCount ?? 0) + 1,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        updatedAt: now,
      })
      .where(eq(paymentWebhookInbox.id, input.id))
  },
}

async function updateInboxRecord(
  id: string,
  patch: Partial<PaymentWebhookInboxRecord>
) {
  const db = getDbClient()

  if (!db) {
    assertPaymentPersistenceAvailable()
    const current = inMemoryInbox.get(id)
    if (!current) {
      return
    }
    inMemoryInbox.set(id, {
      ...current,
      ...patch,
    })
    return
  }

  await db.update(paymentWebhookInbox).set(patch).where(eq(paymentWebhookInbox.id, id))
}

function toInboxRecord(
  row: typeof paymentWebhookInbox.$inferSelect
): PaymentWebhookInboxRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerEventId: row.providerEventId,
    eventType: row.eventType,
    providerOrderId: row.providerOrderId,
    providerCaptureId: row.providerCaptureId,
    status: row.status,
    payload: row.payload ?? null,
    headers: row.headers ?? null,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
    receivedAt: row.receivedAt,
    processingStartedAt: row.processingStartedAt,
    processedAt: row.processedAt,
    nextAttemptAt: row.nextAttemptAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toProviderEventKey(input: {
  provider: PaymentProvider
  providerEventId: string
}) {
  return `${input.provider}:${input.providerEventId}`
}

export function resetInMemoryPaymentWebhookInboxForTests() {
  inMemoryInbox.clear()
  inMemoryInboxByProviderEvent.clear()
}
