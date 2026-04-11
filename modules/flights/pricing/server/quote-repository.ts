import { eq } from "drizzle-orm"

import { getDbClient, pricedQuotes } from "@/lib/db"
import type {
  PricedQuoteRecord,
  PricedQuoteStatus,
} from "@/modules/flights/pricing/domain"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

interface CreateQuoteInput {
  id: string
  partialOfferRequestId: string
  offerId: string
  selectedPartialOffers: string[]
  ownerUserId?: string | null
  ownerGuestId?: string | null
  ownerOrgId?: string | null
  currency: string
  netAmount: number
  sellAmount: number
  appliedRuleId: string | null
  status: PricedQuoteStatus
  expiresAt: Date
}

export interface PricedQuoteRepository {
  create(input: CreateQuoteInput): Promise<PricedQuoteRecord>
  findById(quoteId: string): Promise<PricedQuoteRecord | null>
  updateStatus(quoteId: string, status: PricedQuoteStatus): Promise<void>
}

const inMemoryQuotes = new Map<string, PricedQuoteRecord>()

export const defaultPricedQuoteRepository: PricedQuoteRepository = {
  async create(input) {
    const db = getDbClient()

    if (!db) {
      const now = new Date()
      const quote: PricedQuoteRecord = {
        id: input.id,
        partialOfferRequestId: input.partialOfferRequestId,
        offerId: input.offerId,
        selectedPartialOffers: input.selectedPartialOffers,
        ownerUserId: input.ownerUserId ?? null,
        ownerGuestId: input.ownerGuestId ?? null,
        ownerOrgId: input.ownerOrgId ?? null,
        currency: input.currency,
        netAmount: input.netAmount,
        sellAmount: input.sellAmount,
        appliedRuleId: input.appliedRuleId,
        appliedRuleSpecificity: null,
        status: input.status,
        expiresAt: input.expiresAt,
        createdAt: now,
        updatedAt: now,
      }

      inMemoryQuotes.set(input.id, quote)

      logFlightFlow("pricing.quoteRepository", "created_in_memory_quote", {
        quoteId: quote.id,
      })
      return quote
    }

    const now = new Date()
    const [row] = await db
      .insert(pricedQuotes)
      .values({
        id: input.id,
        partialOfferRequestId: input.partialOfferRequestId,
        offerId: input.offerId,
        selectedPartialOffers: input.selectedPartialOffers,
        ownerUserId: input.ownerUserId ?? null,
        ownerGuestId: input.ownerGuestId ?? null,
        ownerOrgId: input.ownerOrgId ?? null,
        currency: input.currency,
        netAmount: toDbNumeric(input.netAmount),
        sellAmount: toDbNumeric(input.sellAmount),
        appliedRuleId: input.appliedRuleId,
        status: input.status,
        expiresAt: input.expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return toQuoteRecord(row)
  },

  async findById(quoteId) {
    const db = getDbClient()

    if (!db) {
      return inMemoryQuotes.get(quoteId) ?? null
    }

    const [row] = await db
      .select()
      .from(pricedQuotes)
      .where(eq(pricedQuotes.id, quoteId))
      .limit(1)

    if (!row) {
      return null
    }

    return toQuoteRecord(row)
  },

  async updateStatus(quoteId, status) {
    const db = getDbClient()

    if (!db) {
      const existing = inMemoryQuotes.get(quoteId)

      if (!existing) {
        return
      }

      inMemoryQuotes.set(quoteId, {
        ...existing,
        status,
        updatedAt: new Date(),
      })
      return
    }

    await db
      .update(pricedQuotes)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(pricedQuotes.id, quoteId))
  },
}

function toQuoteRecord(row: typeof pricedQuotes.$inferSelect): PricedQuoteRecord {
  return {
    id: row.id,
    partialOfferRequestId: row.partialOfferRequestId,
    offerId: row.offerId,
    selectedPartialOffers: normalizeSelectedPartialOffers(row.selectedPartialOffers),
    ownerUserId: row.ownerUserId,
    ownerGuestId: row.ownerGuestId,
    ownerOrgId: row.ownerOrgId,
    currency: row.currency,
    netAmount: toNumeric(row.netAmount),
    sellAmount: toNumeric(row.sellAmount),
    appliedRuleId: row.appliedRuleId,
    appliedRuleSpecificity: null,
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function normalizeSelectedPartialOffers(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
}

function toNumeric(value: string) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function toDbNumeric(value: number) {
  return value.toFixed(4)
}

export function resetInMemoryQuoteRepositoryForTests() {
  inMemoryQuotes.clear()
}
