import "server-only"

import { and, asc, eq, sql } from "drizzle-orm"

import { getDbClient, paymentEvents } from "@/lib/db"
import type {
  PaymentEventType,
  PaymentProvider,
} from "@/modules/payments/domain"
import { assertPaymentPersistenceAvailable } from "@/modules/payments/server/repository-runtime"

export interface PaymentEventRecord {
  id: string
  paymentAttemptId: string
  eventType: PaymentEventType
  provider: PaymentProvider
  providerEventId: string | null
  providerOrderId: string | null
  providerCaptureId: string | null
  amount: number | null
  currency: string | null
  payload: unknown
  metadata: unknown
  createdAt: Date
}

export interface AppendPaymentEventInput {
  id: string
  paymentAttemptId: string
  eventType: PaymentEventType
  provider: PaymentProvider
  providerEventId?: string | null
  providerOrderId?: string | null
  providerCaptureId?: string | null
  amount?: number | null
  currency?: string | null
  payload?: unknown
  metadata?: unknown
}

export interface PaymentEventsRepository {
  append(input: AppendPaymentEventInput): Promise<PaymentEventRecord>
  listByAttemptId(paymentAttemptId: string): Promise<PaymentEventRecord[]>
}

const inMemoryPaymentEvents = new Map<string, PaymentEventRecord>()
const inMemoryPaymentEventsByProviderEvent = new Map<string, string>()

export const defaultPaymentEventsRepository: PaymentEventsRepository = {
  async append(input) {
    const providerEventKey = input.providerEventId
      ? toProviderEventKey(input.provider, input.providerEventId, input.eventType)
      : null

    if (providerEventKey) {
      const existingId = inMemoryPaymentEventsByProviderEvent.get(providerEventKey)
      const existing = existingId ? inMemoryPaymentEvents.get(existingId) : null

      if (existing) {
        return existing
      }
    }

    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const record: PaymentEventRecord = {
        id: input.id,
        paymentAttemptId: input.paymentAttemptId,
        eventType: input.eventType,
        provider: input.provider,
        providerEventId: input.providerEventId ?? null,
        providerOrderId: input.providerOrderId ?? null,
        providerCaptureId: input.providerCaptureId ?? null,
        amount: input.amount ?? null,
        currency: input.currency ?? null,
        payload: input.payload ?? null,
        metadata: input.metadata ?? null,
        createdAt: now,
      }
      inMemoryPaymentEvents.set(record.id, record)
      if (providerEventKey) {
        inMemoryPaymentEventsByProviderEvent.set(providerEventKey, record.id)
      }
      return record
    }

    const [inserted] = await db
      .insert(paymentEvents)
      .values({
        id: input.id,
        paymentAttemptId: input.paymentAttemptId,
        eventType: input.eventType,
        provider: input.provider,
        providerEventId: input.providerEventId ?? null,
        providerOrderId: input.providerOrderId ?? null,
        providerCaptureId: input.providerCaptureId ?? null,
        amount:
          input.amount === undefined || input.amount === null
            ? null
            : toDbNumeric(input.amount),
        currency: input.currency ?? null,
        payload: input.payload ?? null,
        metadata: input.metadata ?? null,
        createdAt: now,
      })
      .onConflictDoNothing({
        target: [
          paymentEvents.provider,
          paymentEvents.providerEventId,
          paymentEvents.eventType,
        ],
        where: sql`${paymentEvents.providerEventId} is not null`,
      })
      .returning()

    if (inserted) {
      return toPaymentEventRecord(inserted)
    }

    if (!input.providerEventId) {
      throw new Error("Payment event insert failed without a provider event key.")
    }

    const existing = await db.query.paymentEvents.findFirst({
      where: and(
        eq(paymentEvents.provider, input.provider),
        eq(paymentEvents.providerEventId, input.providerEventId),
        eq(paymentEvents.eventType, input.eventType)
      ),
    })

    if (!existing) {
      throw new Error("Payment event idempotency lookup failed after conflict.")
    }

    return toPaymentEventRecord(existing)
  },

  async listByAttemptId(paymentAttemptId) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      return Array.from(inMemoryPaymentEvents.values())
        .filter((event) => event.paymentAttemptId === paymentAttemptId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    }

    const rows = await db.query.paymentEvents.findMany({
      where: eq(paymentEvents.paymentAttemptId, paymentAttemptId),
      orderBy: [asc(paymentEvents.createdAt)],
    })
    return rows.map(toPaymentEventRecord)
  },
}

function toPaymentEventRecord(row: typeof paymentEvents.$inferSelect): PaymentEventRecord {
  return {
    id: row.id,
    paymentAttemptId: row.paymentAttemptId,
    eventType: row.eventType,
    provider: row.provider,
    providerEventId: row.providerEventId,
    providerOrderId: row.providerOrderId,
    providerCaptureId: row.providerCaptureId,
    amount: row.amount === null ? null : Number(row.amount),
    currency: row.currency,
    payload: row.payload ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
  }
}

function toProviderEventKey(
  provider: PaymentProvider,
  providerEventId: string,
  eventType: PaymentEventType
) {
  return `${provider}:${providerEventId}:${eventType}`
}

function toDbNumeric(value: number) {
  return value.toFixed(4)
}

export function resetInMemoryPaymentEventsForTests() {
  inMemoryPaymentEvents.clear()
  inMemoryPaymentEventsByProviderEvent.clear()
}
