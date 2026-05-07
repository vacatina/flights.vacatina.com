import "server-only"

import { eq } from "drizzle-orm"

import { checkoutSessions, getDbClient } from "@/lib/db"
import { normalizeUnknownSelectedStrings } from "@/lib/shared/selection"

export type CheckoutSessionStatus =
  | "processing"
  | "payment_authorized"
  | "completed"
  | "failed"
  | "reconciliation_required"

export interface CheckoutSessionRecord {
  id: string
  idempotencyKey: string
  partialOfferRequestId: string
  quoteId: string
  offerId: string
  selectedPartialOffers: string[]
  ownerUserId: string | null
  ownerGuestId: string | null
  ownerOrgId: string | null
  paymentMode: "pay_now" | "hold"
  currency: string
  netAmount: number
  sellAmount: number
  paymentProvider: string | null
  providerOrderId: string | null
  providerPaymentId: string | null
  providerStatusCode: string | null
  providerStatusMessage: string | null
  paymentCurrency: string | null
  paymentAmount: number | null
  checkoutPayloadSnapshot: unknown
  duffelOrderId: string | null
  paymentInitiatedAt: Date | null
  paymentConfirmedAt: Date | null
  finalizedAt: Date | null
  status: CheckoutSessionStatus
  errorCode: string | null
  errorMessage: string | null
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

interface CreateCheckoutSessionInput {
  id: string
  idempotencyKey: string
  partialOfferRequestId: string
  quoteId: string
  offerId: string
  selectedPartialOffers: string[]
  ownerUserId: string | null
  ownerGuestId: string | null
  ownerOrgId: string | null
  paymentMode: "pay_now" | "hold"
  currency: string
  netAmount: number
  sellAmount: number
  paymentProvider?: string | null
  providerOrderId?: string | null
  providerPaymentId?: string | null
  providerStatusCode?: string | null
  providerStatusMessage?: string | null
  paymentCurrency?: string | null
  paymentAmount?: number | null
  checkoutPayloadSnapshot?: unknown
  status: CheckoutSessionStatus
  paymentInitiatedAt?: Date | null
  paymentConfirmedAt?: Date | null
  finalizedAt?: Date | null
  expiresAt: Date
}

interface UpdateCheckoutSessionInput {
  status?: CheckoutSessionStatus
  paymentProvider?: string | null
  providerOrderId?: string | null
  paymentCurrency?: string | null
  paymentAmount?: number | null
  checkoutPayloadSnapshot?: unknown
  paymentInitiatedAt?: Date | null
  duffelOrderId?: string | null
  providerPaymentId?: string | null
  providerStatusCode?: string | null
  providerStatusMessage?: string | null
  paymentConfirmedAt?: Date | null
  finalizedAt?: Date | null
  errorCode?: string | null
  errorMessage?: string | null
}

export interface CheckoutSessionRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<CheckoutSessionRecord | null>
  findById(id: string): Promise<CheckoutSessionRecord | null>
  findByProviderOrderId(providerOrderId: string): Promise<CheckoutSessionRecord | null>
  create(input: CreateCheckoutSessionInput): Promise<CheckoutSessionRecord>
  update(id: string, patch: UpdateCheckoutSessionInput): Promise<CheckoutSessionRecord | null>
}

const inMemorySessions = new Map<string, CheckoutSessionRecord>()
const inMemorySessionsByIdempotency = new Map<string, string>()

export const defaultCheckoutSessionRepository: CheckoutSessionRepository = {
  async findByIdempotencyKey(idempotencyKey) {
    const db = getDbClient()

    if (!db) {
      const id = inMemorySessionsByIdempotency.get(idempotencyKey)
      return id ? inMemorySessions.get(id) ?? null : null
    }

    const row = await db.query.checkoutSessions.findFirst({
      where: eq(checkoutSessions.idempotencyKey, idempotencyKey),
    })

    return row ? toSessionRecord(row) : null
  },

  async findById(id) {
    const db = getDbClient()

    if (!db) {
      return inMemorySessions.get(id) ?? null
    }

    const row = await db.query.checkoutSessions.findFirst({
      where: eq(checkoutSessions.id, id),
    })

    return row ? toSessionRecord(row) : null
  },

  async findByProviderOrderId(providerOrderId) {
    const db = getDbClient()

    if (!db) {
      for (const session of inMemorySessions.values()) {
        if (session.providerOrderId === providerOrderId) {
          return session
        }
      }

      return null
    }

    const row = await db.query.checkoutSessions.findFirst({
      where: eq(checkoutSessions.providerOrderId, providerOrderId),
    })

    return row ? toSessionRecord(row) : null
  },

  async create(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      const record: CheckoutSessionRecord = {
        id: input.id,
        idempotencyKey: input.idempotencyKey,
        partialOfferRequestId: input.partialOfferRequestId,
        quoteId: input.quoteId,
        offerId: input.offerId,
        selectedPartialOffers: input.selectedPartialOffers,
        ownerUserId: input.ownerUserId,
        ownerGuestId: input.ownerGuestId,
        ownerOrgId: input.ownerOrgId,
        paymentMode: input.paymentMode,
        currency: input.currency,
        netAmount: input.netAmount,
        sellAmount: input.sellAmount,
        paymentProvider: input.paymentProvider ?? null,
        providerOrderId: input.providerOrderId ?? null,
        providerPaymentId: input.providerPaymentId ?? null,
        providerStatusCode: input.providerStatusCode ?? null,
        providerStatusMessage: input.providerStatusMessage ?? null,
        paymentCurrency: input.paymentCurrency ?? null,
        paymentAmount: input.paymentAmount ?? null,
        checkoutPayloadSnapshot: input.checkoutPayloadSnapshot ?? null,
        duffelOrderId: null,
        paymentInitiatedAt: input.paymentInitiatedAt ?? null,
        paymentConfirmedAt: input.paymentConfirmedAt ?? null,
        finalizedAt: input.finalizedAt ?? null,
        status: input.status,
        errorCode: null,
        errorMessage: null,
        expiresAt: input.expiresAt,
        createdAt: now,
        updatedAt: now,
      }
      inMemorySessions.set(record.id, record)
      inMemorySessionsByIdempotency.set(record.idempotencyKey, record.id)
      return record
    }

    const [row] = await db
      .insert(checkoutSessions)
      .values({
        id: input.id,
        idempotencyKey: input.idempotencyKey,
        partialOfferRequestId: input.partialOfferRequestId,
        quoteId: input.quoteId,
        offerId: input.offerId,
        selectedPartialOffers: input.selectedPartialOffers,
        ownerUserId: input.ownerUserId,
        ownerGuestId: input.ownerGuestId,
        ownerOrgId: input.ownerOrgId,
        paymentMode: input.paymentMode,
        currency: input.currency,
        netAmount: toDbNumeric(input.netAmount),
        sellAmount: toDbNumeric(input.sellAmount),
        paymentProvider: input.paymentProvider ?? null,
        providerOrderId: input.providerOrderId ?? null,
        providerPaymentId: input.providerPaymentId ?? null,
        providerStatusCode: input.providerStatusCode ?? null,
        providerStatusMessage: input.providerStatusMessage ?? null,
        paymentCurrency: input.paymentCurrency ?? null,
        paymentAmount:
          input.paymentAmount === undefined || input.paymentAmount === null
            ? null
            : toDbNumeric(input.paymentAmount),
        checkoutPayloadSnapshot: input.checkoutPayloadSnapshot ?? null,
        paymentInitiatedAt: input.paymentInitiatedAt ?? null,
        paymentConfirmedAt: input.paymentConfirmedAt ?? null,
        finalizedAt: input.finalizedAt ?? null,
        status: input.status,
        expiresAt: input.expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return toSessionRecord(row)
  },

  async update(id, patch) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      const existing = inMemorySessions.get(id)

      if (!existing) {
        return null
      }

      const updated: CheckoutSessionRecord = {
        ...existing,
        ...patch,
        updatedAt: now,
      }
      inMemorySessions.set(id, updated)
      return updated
    }

    const [row] = await db
      .update(checkoutSessions)
      .set({
        ...toDbPatch(patch),
        updatedAt: now,
      })
      .where(eq(checkoutSessions.id, id))
      .returning()

    return row ? toSessionRecord(row) : null
  },
}

function toSessionRecord(row: typeof checkoutSessions.$inferSelect): CheckoutSessionRecord {
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    partialOfferRequestId: row.partialOfferRequestId,
    quoteId: row.quoteId,
    offerId: row.offerId,
    selectedPartialOffers: normalizeUnknownSelectedStrings(row.selectedPartialOffers),
    ownerUserId: row.ownerUserId,
    ownerGuestId: row.ownerGuestId,
    ownerOrgId: row.ownerOrgId,
    paymentMode: row.paymentMode,
    currency: row.currency,
    netAmount: Number(row.netAmount),
    sellAmount: Number(row.sellAmount),
    paymentProvider: row.paymentProvider,
    providerOrderId: row.providerOrderId,
    providerPaymentId: row.providerPaymentId,
    providerStatusCode: row.providerStatusCode,
    providerStatusMessage: row.providerStatusMessage,
    paymentCurrency: row.paymentCurrency,
    paymentAmount: row.paymentAmount === null ? null : Number(row.paymentAmount),
    checkoutPayloadSnapshot: row.checkoutPayloadSnapshot ?? null,
    duffelOrderId: row.duffelOrderId,
    paymentInitiatedAt: row.paymentInitiatedAt,
    paymentConfirmedAt: row.paymentConfirmedAt,
    finalizedAt: row.finalizedAt,
    status: row.status,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDbNumeric(value: number) {
  return value.toFixed(4)
}

function toDbPatch(patch: UpdateCheckoutSessionInput) {
  const output: Record<string, unknown> = {
    ...patch,
  }

  if (patch.paymentAmount !== undefined) {
    output.paymentAmount =
      patch.paymentAmount === null ? null : toDbNumeric(patch.paymentAmount)
  }

  return output
}

export function resetInMemoryCheckoutSessionsForTests() {
  inMemorySessions.clear()
  inMemorySessionsByIdempotency.clear()
}
