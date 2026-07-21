import "server-only"

import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm"

import { getDbClient, paymentAttempts } from "@/lib/db"
import type {
  PaymentAttemptStatus,
  PaymentInternalOrderType,
  PaymentOwner,
  PaymentProvider,
} from "@/modules/payments/domain"
import { assertPaymentPersistenceAvailable } from "@/modules/payments/server/repository-runtime"

export interface PaymentAttemptRecord extends PaymentOwner {
  id: string
  internalOrderType: PaymentInternalOrderType
  internalOrderId: string
  provider: PaymentProvider
  status: PaymentAttemptStatus
  currency: string
  amount: number
  providerOrderId: string | null
  providerCaptureId: string | null
  providerStatus: string | null
  createIdempotencyKey: string
  captureIdempotencyKey: string
  clientIdempotencyKey: string
  checkoutPayloadSnapshot: unknown
  lastProviderPayload: unknown
  failureCode: string | null
  failureMessage: string | null
  reconciliationRequiredAt: Date | null
  nextReconciliationAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreatePaymentAttemptInput extends PaymentOwner {
  id: string
  internalOrderType: PaymentInternalOrderType
  internalOrderId: string
  provider: PaymentProvider
  status?: PaymentAttemptStatus
  currency: string
  amount: number
  providerOrderId?: string | null
  providerCaptureId?: string | null
  providerStatus?: string | null
  createIdempotencyKey: string
  captureIdempotencyKey: string
  clientIdempotencyKey: string
  checkoutPayloadSnapshot?: unknown
  nextReconciliationAt?: Date | null
}

export interface UpdatePaymentAttemptInput {
  status?: PaymentAttemptStatus
  providerOrderId?: string | null
  providerCaptureId?: string | null
  providerStatus?: string | null
  lastProviderPayload?: unknown
  failureCode?: string | null
  failureMessage?: string | null
  reconciliationRequiredAt?: Date | null
  nextReconciliationAt?: Date | null
}

export interface PaymentAttemptsRepository {
  createOrFindByIdempotency(
    input: CreatePaymentAttemptInput
  ): Promise<PaymentAttemptRecord>
  findById(id: string): Promise<PaymentAttemptRecord | null>
  findByInternalIdempotency(input: {
    internalOrderType: PaymentInternalOrderType
    internalOrderId: string
    clientIdempotencyKey: string
  }): Promise<PaymentAttemptRecord | null>
  findByProviderOrderId(input: {
    provider: PaymentProvider
    providerOrderId: string
  }): Promise<PaymentAttemptRecord | null>
  findReconciliationCandidates(input: {
    now: Date
    limit: number
  }): Promise<PaymentAttemptRecord[]>
  update(id: string, patch: UpdatePaymentAttemptInput): Promise<PaymentAttemptRecord | null>
}

const inMemoryAttempts = new Map<string, PaymentAttemptRecord>()
const inMemoryAttemptsByInternalIdempotency = new Map<string, string>()

export const defaultPaymentAttemptsRepository: PaymentAttemptsRepository = {
  async createOrFindByIdempotency(input) {
    const existing = await this.findByInternalIdempotency({
      internalOrderType: input.internalOrderType,
      internalOrderId: input.internalOrderId,
      clientIdempotencyKey: input.clientIdempotencyKey,
    })

    if (existing) {
      return existing
    }

    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const record: PaymentAttemptRecord = {
        ...input,
        status: input.status ?? "created",
        providerOrderId: input.providerOrderId ?? null,
        providerCaptureId: input.providerCaptureId ?? null,
        providerStatus: input.providerStatus ?? null,
        checkoutPayloadSnapshot: input.checkoutPayloadSnapshot ?? null,
        lastProviderPayload: null,
        failureCode: null,
        failureMessage: null,
        reconciliationRequiredAt: null,
        nextReconciliationAt: input.nextReconciliationAt ?? null,
        createdAt: now,
        updatedAt: now,
      }
      inMemoryAttempts.set(record.id, record)
      inMemoryAttemptsByInternalIdempotency.set(toInternalKey(record), record.id)
      return record
    }

    const [inserted] = await db
      .insert(paymentAttempts)
      .values({
        id: input.id,
        internalOrderType: input.internalOrderType,
        internalOrderId: input.internalOrderId,
        ownerUserId: input.ownerUserId,
        ownerGuestId: input.ownerGuestId,
        ownerOrgId: input.ownerOrgId,
        provider: input.provider,
        status: input.status ?? "created",
        currency: input.currency,
        amount: toDbNumeric(input.amount),
        providerOrderId: input.providerOrderId ?? null,
        providerCaptureId: input.providerCaptureId ?? null,
        providerStatus: input.providerStatus ?? null,
        createIdempotencyKey: input.createIdempotencyKey,
        captureIdempotencyKey: input.captureIdempotencyKey,
        clientIdempotencyKey: input.clientIdempotencyKey,
        checkoutPayloadSnapshot: input.checkoutPayloadSnapshot ?? null,
        nextReconciliationAt: input.nextReconciliationAt ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [
          paymentAttempts.internalOrderType,
          paymentAttempts.internalOrderId,
          paymentAttempts.clientIdempotencyKey,
        ],
      })
      .returning()

    if (inserted) {
      return toPaymentAttemptRecord(inserted)
    }

    const afterConflict = await this.findByInternalIdempotency({
      internalOrderType: input.internalOrderType,
      internalOrderId: input.internalOrderId,
      clientIdempotencyKey: input.clientIdempotencyKey,
    })

    if (!afterConflict) {
      throw new Error("Payment attempt idempotency lookup failed after conflict.")
    }

    return afterConflict
  },

  async findById(id) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      return inMemoryAttempts.get(id) ?? null
    }

    const row = await db.query.paymentAttempts.findFirst({
      where: eq(paymentAttempts.id, id),
    })
    return row ? toPaymentAttemptRecord(row) : null
  },

  async findByInternalIdempotency(input) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const id = inMemoryAttemptsByInternalIdempotency.get(toInternalKey(input))
      return id ? inMemoryAttempts.get(id) ?? null : null
    }

    const row = await db.query.paymentAttempts.findFirst({
      where: and(
        eq(paymentAttempts.internalOrderType, input.internalOrderType),
        eq(paymentAttempts.internalOrderId, input.internalOrderId),
        eq(paymentAttempts.clientIdempotencyKey, input.clientIdempotencyKey)
      ),
    })
    return row ? toPaymentAttemptRecord(row) : null
  },

  async findByProviderOrderId(input) {
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      return (
        Array.from(inMemoryAttempts.values()).find(
          (attempt) =>
            attempt.provider === input.provider &&
            attempt.providerOrderId === input.providerOrderId
        ) ?? null
      )
    }

    const row = await db.query.paymentAttempts.findFirst({
      where: and(
        eq(paymentAttempts.provider, input.provider),
        eq(paymentAttempts.providerOrderId, input.providerOrderId)
      ),
    })
    return row ? toPaymentAttemptRecord(row) : null
  },

  async findReconciliationCandidates(input) {
    const statuses: PaymentAttemptStatus[] = [
      "created",
      "provider_order_created",
      "buyer_approved",
      "capture_pending",
      "capture_completed",
      "reconciliation_required",
    ]
    const db = getDbClient()

    if (!db) {
      assertPaymentPersistenceAvailable()
      return Array.from(inMemoryAttempts.values())
        .filter((attempt) => statuses.includes(attempt.status))
        .filter(
          (attempt) =>
            !attempt.nextReconciliationAt || attempt.nextReconciliationAt <= input.now
        )
        .sort((left, right) => left.updatedAt.getTime() - right.updatedAt.getTime())
        .slice(0, input.limit)
    }

    const rows = await db.query.paymentAttempts.findMany({
      where: and(
        inArray(paymentAttempts.status, statuses),
        or(
          isNull(paymentAttempts.nextReconciliationAt),
          lte(paymentAttempts.nextReconciliationAt, input.now)
        )
      ),
      orderBy: [asc(paymentAttempts.updatedAt)],
      limit: input.limit,
    })

    return rows.map(toPaymentAttemptRecord)
  },

  async update(id, patch) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      assertPaymentPersistenceAvailable()
      const current = inMemoryAttempts.get(id)

      if (!current) {
        return null
      }

      const updated: PaymentAttemptRecord = {
        ...current,
        ...patch,
        updatedAt: now,
      }
      inMemoryAttempts.set(id, updated)
      return updated
    }

    const [row] = await db
      .update(paymentAttempts)
      .set({
        ...patch,
        updatedAt: now,
      })
      .where(eq(paymentAttempts.id, id))
      .returning()

    return row ? toPaymentAttemptRecord(row) : null
  },
}

function toInternalKey(input: {
  internalOrderType: string
  internalOrderId: string
  clientIdempotencyKey: string
}) {
  return `${input.internalOrderType}:${input.internalOrderId}:${input.clientIdempotencyKey}`
}

function toPaymentAttemptRecord(
  row: typeof paymentAttempts.$inferSelect
): PaymentAttemptRecord {
  return {
    id: row.id,
    internalOrderType: row.internalOrderType as PaymentInternalOrderType,
    internalOrderId: row.internalOrderId,
    ownerUserId: row.ownerUserId,
    ownerGuestId: row.ownerGuestId,
    ownerOrgId: row.ownerOrgId,
    provider: row.provider,
    status: row.status,
    currency: row.currency,
    amount: Number(row.amount),
    providerOrderId: row.providerOrderId,
    providerCaptureId: row.providerCaptureId,
    providerStatus: row.providerStatus,
    createIdempotencyKey: row.createIdempotencyKey,
    captureIdempotencyKey: row.captureIdempotencyKey,
    clientIdempotencyKey: row.clientIdempotencyKey,
    checkoutPayloadSnapshot: row.checkoutPayloadSnapshot ?? null,
    lastProviderPayload: row.lastProviderPayload ?? null,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    reconciliationRequiredAt: row.reconciliationRequiredAt,
    nextReconciliationAt: row.nextReconciliationAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDbNumeric(value: number) {
  return value.toFixed(4)
}

export function resetInMemoryPaymentAttemptsForTests() {
  inMemoryAttempts.clear()
  inMemoryAttemptsByInternalIdempotency.clear()
}
