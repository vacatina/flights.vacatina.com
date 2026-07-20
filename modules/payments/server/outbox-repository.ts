import "server-only"

import { and, asc, eq, lte } from "drizzle-orm"

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
  claimPending(id: string, now: Date): Promise<PaymentOutboxRecord | null>
  markProcessing(id: string, now: Date): Promise<void>
  markCompleted(id: string, now: Date): Promise<void>
  markFailed(input: {
    id: string
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
        .filter((record) => record.status === "pending" && record.nextAttemptAt <= now)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .slice(0, limit)
    }

    const rows = await db.query.paymentOutbox.findMany({
      where: and(
        eq(paymentOutbox.status, "pending"),
        lte(paymentOutbox.nextAttemptAt, now)
      ),
      orderBy: [asc(paymentOutbox.createdAt)],
      limit,
    })
    return rows.map(toOutboxRecord)
  },

  async claimPending(id, now) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryOutbox.get(id)

      if (!current || current.status !== "pending" || current.nextAttemptAt > now) {
        return null
      }

      const claimed: PaymentOutboxRecord = {
        ...current,
        status: "processing",
        updatedAt: now,
      }
      inMemoryOutbox.set(id, claimed)
      return claimed
    }

    const [row] = await db
      .update(paymentOutbox)
      .set({
        status: "processing",
        updatedAt: now,
      })
      .where(
        and(
          eq(paymentOutbox.id, id),
          eq(paymentOutbox.status, "pending"),
          lte(paymentOutbox.nextAttemptAt, now)
        )
      )
      .returning()

    return row ? toOutboxRecord(row) : null
  },

  async markProcessing(id, now) {
    await updateOutboxRecord(id, {
      status: "processing",
      updatedAt: now,
    })
  },

  async markCompleted(id, now) {
    await updateOutboxRecord(id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
  },

  async markFailed(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryOutbox.get(input.id)
      if (!current) {
        return
      }
      inMemoryOutbox.set(input.id, {
        ...current,
        status: input.permanent ? "failed" : "pending",
        attemptCount: current.attemptCount + 1,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        updatedAt: now,
      })
      return
    }

    const current = await db.query.paymentOutbox.findFirst({
      where: eq(paymentOutbox.id, input.id),
      columns: { attemptCount: true },
    })

    await db
      .update(paymentOutbox)
      .set({
        status: input.permanent ? "failed" : "pending",
        attemptCount: (current?.attemptCount ?? 0) + 1,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        updatedAt: now,
      })
      .where(eq(paymentOutbox.id, input.id))
  },
}

async function updateOutboxRecord(id: string, patch: Partial<PaymentOutboxRecord>) {
  const db = getDbClient()

  if (!db) {
    assertPaymentPersistenceAvailable()
    const current = inMemoryOutbox.get(id)
    if (!current) {
      return
    }
    inMemoryOutbox.set(id, {
      ...current,
      ...patch,
    })
    return
  }

  await db.update(paymentOutbox).set(patch).where(eq(paymentOutbox.id, id))
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  }
}

export function resetInMemoryPaymentOutboxForTests() {
  inMemoryOutbox.clear()
  inMemoryOutboxByUniqueKey.clear()
}
