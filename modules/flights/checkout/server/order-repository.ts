import "server-only"

import { eq } from "drizzle-orm"

import { flightOrders, getDbClient } from "@/lib/db"

export interface FlightOrderRecord {
  id: string
  checkoutSessionId: string
  duffelOrderId: string
  partialOfferRequestId: string
  offerId: string
  selectedPartialOffers: string[]
  ownerUserId: string | null
  ownerGuestId: string | null
  ownerOrgId: string | null
  paymentMode: "pay_now" | "hold"
  settlementType: "balance"
  currency: string
  netAmount: number
  sellAmount: number
  duffelTotalAmount: number
  duffelTotalCurrency: string
  paymentAwaiting: boolean
  paymentRequiredBy: Date | null
  priceGuaranteeExpiresAt: Date | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface CreateFlightOrderInput {
  id: string
  checkoutSessionId: string
  duffelOrderId: string
  partialOfferRequestId: string
  offerId: string
  selectedPartialOffers: string[]
  ownerUserId: string | null
  ownerGuestId: string | null
  ownerOrgId: string | null
  paymentMode: "pay_now" | "hold"
  settlementType: "balance"
  currency: string
  netAmount: number
  sellAmount: number
  duffelTotalAmount: number
  duffelTotalCurrency: string
  paymentAwaiting: boolean
  paymentRequiredBy: Date | null
  priceGuaranteeExpiresAt: Date | null
  paidAt: Date | null
}

export interface FlightOrderRepository {
  create(input: CreateFlightOrderInput): Promise<FlightOrderRecord>
  findByCheckoutSessionId(checkoutSessionId: string): Promise<FlightOrderRecord | null>
}

const inMemoryOrders = new Map<string, FlightOrderRecord>()
const inMemoryOrdersByCheckoutSession = new Map<string, string>()

export const defaultFlightOrderRepository: FlightOrderRepository = {
  async create(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      const record: FlightOrderRecord = {
        ...input,
        createdAt: now,
        updatedAt: now,
      }
      inMemoryOrders.set(record.id, record)
      inMemoryOrdersByCheckoutSession.set(record.checkoutSessionId, record.id)
      return record
    }

    const [row] = await db
      .insert(flightOrders)
      .values({
        ...input,
        netAmount: toDbNumeric(input.netAmount),
        sellAmount: toDbNumeric(input.sellAmount),
        duffelTotalAmount: toDbNumeric(input.duffelTotalAmount),
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return toOrderRecord(row)
  },
  async findByCheckoutSessionId(checkoutSessionId) {
    const db = getDbClient()

    if (!db) {
      const orderId = inMemoryOrdersByCheckoutSession.get(checkoutSessionId)
      return orderId ? inMemoryOrders.get(orderId) ?? null : null
    }

    const row = await db.query.flightOrders.findFirst({
      where: eq(flightOrders.checkoutSessionId, checkoutSessionId),
    })

    return row ? toOrderRecord(row) : null
  },
}

function toOrderRecord(row: typeof flightOrders.$inferSelect): FlightOrderRecord {
  return {
    id: row.id,
    checkoutSessionId: row.checkoutSessionId,
    duffelOrderId: row.duffelOrderId,
    partialOfferRequestId: row.partialOfferRequestId,
    offerId: row.offerId,
    selectedPartialOffers: normalizeSelected(row.selectedPartialOffers),
    ownerUserId: row.ownerUserId,
    ownerGuestId: row.ownerGuestId,
    ownerOrgId: row.ownerOrgId,
    paymentMode: row.paymentMode,
    settlementType: row.settlementType,
    currency: row.currency,
    netAmount: Number(row.netAmount),
    sellAmount: Number(row.sellAmount),
    duffelTotalAmount: Number(row.duffelTotalAmount),
    duffelTotalCurrency: row.duffelTotalCurrency,
    paymentAwaiting: row.paymentAwaiting,
    paymentRequiredBy: row.paymentRequiredBy,
    priceGuaranteeExpiresAt: row.priceGuaranteeExpiresAt,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function normalizeSelected(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

function toDbNumeric(value: number) {
  return value.toFixed(4)
}

export function resetInMemoryFlightOrdersForTests() {
  inMemoryOrders.clear()
  inMemoryOrdersByCheckoutSession.clear()
}
