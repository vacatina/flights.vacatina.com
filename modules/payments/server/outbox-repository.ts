import "server-only"

import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm"

import { getDbClient, paymentOutbox } from "@/lib/db"
import type {
  PaymentInternalOrderType,
  PaymentOutboxStatus,
  PaymentOutboxTaskType,
} from "@/modules/payments/domain"
import { assertPaymentPersistenceAvailable } from "@/modules/payments/server/repository-runtime"

export interface PaymentOutboxRecord {
  id: string
  taskType: PaymentOutboxTaskType
  status: PaymentOutboxStatus
  uniqueKey: string
  paymentAttemptId: string
  internalOrderType: PaymentInternalOrderType
  internalOrderId: string
  payload: unknown
  attemptCount: number
  lastError: string | null
  nextAttemptAt: Date
  claimedBy: string | null
  claimExpiresAt: Date | null
  processingStartedAt: Date | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

export interface EnqueuePaymentOutboxTaskInput {
  id: string
  taskType: PaymentOutboxTaskType
  uniqueKey: string
  paymentAttemptId: string
  internalOrderType: PaymentInternalOrderType
  internalOrderId: string
  payload?: unknown
  nextAttemptAt?: Date
}

export interface PaymentOutboxRepository {
  enqueueUnique(input: EnqueuePaymentOutboxTaskInput): Promise<PaymentOutboxRecord>
  findByUniqueKey(uniqueKey: string): Promise<PaymentOutboxRecord | null>
  findPending(now: Date, limit: number): Promise<PaymentOutboxRecord[]>
  claimPending(input: {
    id: string
    workerId: string
    now: Date
    leaseExpiresAt: Date
  }): Promise<PaymentOutboxRecord | null>
  markCompleted(input: { id: string; workerId: string; now: Date }): Promise<boolean>
  markFailed(input: {
    id: string
    workerId: string
    lastError: string
    nextAttemptAt: Date
    permanent?: boolean
  }): Promise<void>
}

const inMemoryOutbox = new Map<string, PaymentOutboxRecord>()
const inMemoryOutboxByUniqueKey = new Map<string, string>()

export const defaultPaymentOutboxRepository: PaymentOutboxRepository = {
  async enqueueUnique(input) {
    const existing = await this.findByUniqueKey(input.uniqueKey)

    if (existing) {
      return existing
    }

    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const record: PaymentOutboxRecord = {
        id: input.id,
        taskType: input.taskType,
        status: "pending",
        uniqueKey: input.uniqueKey,
        paymentAttemptId: input.paymentAttemptId,
        internalOrderType: input.internalOrderType,
        internalOrderId: input.internalOrderId,
        payload: input.payload ?? null,
        attemptCount: 0,
        lastError: null,
        nextAttemptAt: input.nextAttemptAt ?? now,
        claimedBy: null,
        claimExpiresAt: null,
        processingStartedAt: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      }
      inMemoryOutbox.set(record.id, record)
      inMemoryOutboxByUniqueKey.set(record.uniqueKey, record.id)
      return record
    }

    const [inserted] = await db
      .insert(paymentOutbox)
      .values({
        id: input.id,
        taskType: input.taskType,
        status: "pending",
        uniqueKey: input.uniqueKey,
        paymentAttemptId: input.paymentAttemptId,
        internalOrderType: input.internalOrderType,
        internalOrderId: input.internalOrderId,
        payload: input.payload ?? null,
        attemptCount: 0,
        lastError: null,
        nextAttemptAt: input.nextAttemptAt ?? now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: paymentOutbox.uniqueKey,
      })
      .returning()

    if (inserted) {
      return toOutboxRecord(inserted)
    }

    const afterConflict = await this.findByUniqueKey(input.uniqueKey)

    if (!afterConflict) {
      throw new Error("Payment outbox lookup failed after conflict.")
    }

    return afterConflict
  },

  async findByUniqueKey(uniqueKey) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const id = inMemoryOutboxByUniqueKey.get(uniqueKey)
      return id ? inMemoryOutbox.get(id) ?? null : null
    }

    const row = await db.query.paymentOutbox.findFirst({
      where: eq(paymentOutbox.uniqueKey, uniqueKey),
    })
    return row ? toOutboxRecord(row) : null
  },

  async findPending(now, limit) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      return Array.from(inMemoryOutbox.values())
        .filter((record) => isOutboxRecordClaimable(record, now))
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .slice(0, limit)
    }

    const rows = await db.query.paymentOutbox.findMany({
      where: claimableOutboxWhere(now),
      orderBy: [asc(paymentOutbox.createdAt)],
      limit,
    })
    return rows.map(toOutboxRecord)
  },

  async claimPending(input) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryOutbox.get(input.id)

      if (!current || !isOutboxRecordClaimable(current, input.now)) {
        return null
      }

      const claimed: PaymentOutboxRecord = {
        ...current,
        status: "processing",
        claimedBy: input.workerId,
        claimExpiresAt: input.leaseExpiresAt,
        processingStartedAt: input.now,
        updatedAt: input.now,
      }
      inMemoryOutbox.set(input.id, claimed)
      return claimed
    }

    const [row] = await db
      .update(paymentOutbox)
      .set({
        status: "processing",
        claimedBy: input.workerId,
        claimExpiresAt: input.leaseExpiresAt,
        processingStartedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(paymentOutbox.id, input.id),
          claimableOutboxWhere(input.now)
        )
      )
      .returning()

    return row ? toOutboxRecord(row) : null
  },

  async markCompleted(input) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryOutbox.get(input.id)

      if (!current || !isOutboxLeaseHeldBy(current, input.workerId, input.now)) {
        return false
      }

      inMemoryOutbox.set(input.id, {
        ...current,
        status: "completed",
        claimedBy: null,
        claimExpiresAt: null,
        completedAt: input.now,
        updatedAt: input.now,
      })
      return true
    }

    const [row] = await db
      .update(paymentOutbox)
      .set({
        status: "completed",
        claimedBy: null,
        claimExpiresAt: null,
        completedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(paymentOutbox.id, input.id),
          eq(paymentOutbox.status, "processing"),
          eq(paymentOutbox.claimedBy, input.workerId),
          gt(paymentOutbox.claimExpiresAt, input.now)
        )
      )
      .returning({ id: paymentOutbox.id })

    return Boolean(row)
  },

  async markFailed(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryOutbox.get(input.id)
      if (!current || !isOutboxLeaseHeldBy(current, input.workerId, now)) {
        return
      }
      inMemoryOutbox.set(input.id, {
        ...current,
        status: input.permanent ? "failed" : "pending",
        attemptCount: current.attemptCount + 1,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        claimedBy: null,
        claimExpiresAt: null,
        updatedAt: now,
      })
      return
    }

    const current = await db.query.paymentOutbox.findFirst({
      where: and(
        eq(paymentOutbox.id, input.id),
        eq(paymentOutbox.status, "processing"),
        eq(paymentOutbox.claimedBy, input.workerId),
        gt(paymentOutbox.claimExpiresAt, now)
      ),
      columns: { attemptCount: true },
    })

    if (!current) {
      return
    }

    await db
      .update(paymentOutbox)
      .set({
        status: input.permanent ? "failed" : "pending",
        attemptCount: current.attemptCount + 1,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        claimedBy: null,
        claimExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(paymentOutbox.id, input.id),
          eq(paymentOutbox.status, "processing"),
          eq(paymentOutbox.claimedBy, input.workerId)
        )
      )
  },
}

function toOutboxRecord(row: typeof paymentOutbox.$inferSelect): PaymentOutboxRecord {
  return {
    id: row.id,
    taskType: row.taskType,
    status: row.status,
    uniqueKey: row.uniqueKey,
    paymentAttemptId: row.paymentAttemptId,
    internalOrderType: row.internalOrderType as PaymentInternalOrderType,
    internalOrderId: row.internalOrderId,
    payload: row.payload ?? null,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
    nextAttemptAt: row.nextAttemptAt,
    claimedBy: row.claimedBy,
    claimExpiresAt: row.claimExpiresAt,
    processingStartedAt: row.processingStartedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  }
}

function claimableOutboxWhere(now: Date) {
  return and(
    lte(paymentOutbox.nextAttemptAt, now),
    or(
      eq(paymentOutbox.status, "pending"),
      and(
        eq(paymentOutbox.status, "processing"),
        lte(paymentOutbox.claimExpiresAt, now)
      )
    ),
    or(isNull(paymentOutbox.claimExpiresAt), lte(paymentOutbox.claimExpiresAt, now))
  )
}

function isOutboxRecordClaimable(record: PaymentOutboxRecord, now: Date) {
  if (record.nextAttemptAt > now) {
    return false
  }

  if (record.status === "pending") {
    return !record.claimExpiresAt || record.claimExpiresAt <= now
  }

  const claimExpiresAt = record.claimExpiresAt

  return record.status === "processing" && claimExpiresAt !== null && claimExpiresAt <= now
}

function isOutboxLeaseHeldBy(
  record: PaymentOutboxRecord,
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

export function resetInMemoryPaymentOutboxForTests() {
  inMemoryOutbox.clear()
  inMemoryOutboxByUniqueKey.clear()
}
