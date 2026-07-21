import "server-only"

import { and, asc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm"

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
  claimedBy: string | null
  claimExpiresAt: Date | null
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
  claimReady(input: {
    id: string
    workerId: string
    now: Date
    leaseExpiresAt: Date
  }): Promise<PaymentWebhookInboxRecord | null>
  markProcessed(input: { id: string; workerId: string; now: Date }): Promise<boolean>
  markFailed(input: {
    id: string
    workerId: string
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
        claimedBy: null,
        claimExpiresAt: null,
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
        .filter((record) => isInboxRecordClaimable(record, now))
        .sort((left, right) => left.receivedAt.getTime() - right.receivedAt.getTime())
        .slice(0, limit)
    }

    const rows = await db.query.paymentWebhookInbox.findMany({
      where: claimableInboxWhere(now),
      orderBy: [asc(paymentWebhookInbox.receivedAt)],
      limit,
    })
    return rows.map(toInboxRecord)
  },

  async claimReady(input) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryInbox.get(input.id)

      if (!current || !isInboxRecordClaimable(current, input.now)) {
        return null
      }

      const claimed: PaymentWebhookInboxRecord = {
        ...current,
        status: "processing",
        claimedBy: input.workerId,
        claimExpiresAt: input.leaseExpiresAt,
        processingStartedAt: input.now,
        updatedAt: input.now,
      }
      inMemoryInbox.set(input.id, claimed)
      return claimed
    }

    const [row] = await db
      .update(paymentWebhookInbox)
      .set({
        status: "processing",
        claimedBy: input.workerId,
        claimExpiresAt: input.leaseExpiresAt,
        processingStartedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(paymentWebhookInbox.id, input.id),
          claimableInboxWhere(input.now)
        )
      )
      .returning()

    return row ? toInboxRecord(row) : null
  },

  async markProcessed(input) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryInbox.get(input.id)

      if (!current || !isInboxLeaseHeldBy(current, input.workerId, input.now)) {
        return false
      }

      inMemoryInbox.set(input.id, {
        ...current,
        status: "processed",
        claimedBy: null,
        claimExpiresAt: null,
        processedAt: input.now,
        updatedAt: input.now,
      })
      return true
    }

    const [row] = await db
      .update(paymentWebhookInbox)
      .set({
        status: "processed",
        claimedBy: null,
        claimExpiresAt: null,
        processedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(paymentWebhookInbox.id, input.id),
          eq(paymentWebhookInbox.status, "processing"),
          eq(paymentWebhookInbox.claimedBy, input.workerId),
          gt(paymentWebhookInbox.claimExpiresAt, input.now)
        )
      )
      .returning({ id: paymentWebhookInbox.id })

    return Boolean(row)
  },

  async markFailed(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryInbox.get(input.id)
      if (!current || !isInboxLeaseHeldBy(current, input.workerId, now)) {
        return
      }
      inMemoryInbox.set(input.id, {
        ...current,
        status: "failed",
        attemptCount: current.attemptCount + 1,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        claimedBy: null,
        claimExpiresAt: null,
        updatedAt: now,
      })
      return
    }

    const current = await db.query.paymentWebhookInbox.findFirst({
      where: and(
        eq(paymentWebhookInbox.id, input.id),
        eq(paymentWebhookInbox.status, "processing"),
        eq(paymentWebhookInbox.claimedBy, input.workerId),
        gt(paymentWebhookInbox.claimExpiresAt, now)
      ),
      columns: { attemptCount: true },
    })

    if (!current) {
      return
    }

    await db
      .update(paymentWebhookInbox)
      .set({
        status: "failed",
        attemptCount: current.attemptCount + 1,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        claimedBy: null,
        claimExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(paymentWebhookInbox.id, input.id),
          eq(paymentWebhookInbox.status, "processing"),
          eq(paymentWebhookInbox.claimedBy, input.workerId)
        )
      )
  },
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
    claimedBy: row.claimedBy,
    claimExpiresAt: row.claimExpiresAt,
    nextAttemptAt: row.nextAttemptAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function claimableInboxWhere(now: Date) {
  return and(
    lte(paymentWebhookInbox.nextAttemptAt, now),
    or(
      inArray(paymentWebhookInbox.status, ["received", "failed"]),
      and(
        eq(paymentWebhookInbox.status, "processing"),
        lte(paymentWebhookInbox.claimExpiresAt, now)
      )
    ),
    or(
      isNull(paymentWebhookInbox.claimExpiresAt),
      lte(paymentWebhookInbox.claimExpiresAt, now)
    )
  )
}

function isInboxRecordClaimable(record: PaymentWebhookInboxRecord, now: Date) {
  if (record.nextAttemptAt > now) {
    return false
  }

  if (record.status === "received" || record.status === "failed") {
    return !record.claimExpiresAt || record.claimExpiresAt <= now
  }

  const claimExpiresAt = record.claimExpiresAt

  return record.status === "processing" && claimExpiresAt !== null && claimExpiresAt <= now
}

function isInboxLeaseHeldBy(
  record: PaymentWebhookInboxRecord,
  workerId: string,
  now: Date
) {
  const claimExpiresAt = record.claimExpiresAt

  return (
    record.status === "processing" &&
    record.claimedBy === workerId &&
    claimExpiresAt !== null &&
    claimExpiresAt > now
  )
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
