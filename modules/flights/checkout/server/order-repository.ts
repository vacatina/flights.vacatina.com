import "server-only"

import { and, asc, count, desc, eq, ilike } from "drizzle-orm"

import { flightOrders, getDbClient } from "@/lib/db"
import { normalizeUnknownSelectedStrings } from "@/lib/shared/selection"
import type {
  BookingListSort,
  BookingListStatusFilter,
} from "@/modules/flights/orders/domain"

export interface FlightOrderRecord {
  id: string
  bookingReference: string
  checkoutSessionId: string
  duffelOrderId: string
  partialOfferRequestId: string
  offerId: string
  selectedPartialOffers: string[]
  ownerUserId: string | null
  ownerGuestId: string | null
  ownerOrgId: string | null
  contactEmail: string
  contactEmailHash: string
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
  orderSnapshot: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

interface CreateFlightOrderInput {
  id: string
  bookingReference: string
  checkoutSessionId: string
  duffelOrderId: string
  partialOfferRequestId: string
  offerId: string
  selectedPartialOffers: string[]
  ownerUserId: string | null
  ownerGuestId: string | null
  ownerOrgId: string | null
  contactEmail: string
  contactEmailHash: string
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
  orderSnapshot: Record<string, unknown>
}

interface ListFlightOrdersByUserInput {
  ownerUserId: string
  limit: number
  offset: number
  q?: string
  status: BookingListStatusFilter
  sort: BookingListSort
}

interface FlightOrderListResult {
  records: FlightOrderRecord[]
  total: number
}

export interface FlightOrderRepository {
  create(input: CreateFlightOrderInput): Promise<FlightOrderRecord>
  findByCheckoutSessionId(checkoutSessionId: string): Promise<FlightOrderRecord | null>
  findByBookingReference(bookingReference: string): Promise<FlightOrderRecord | null>
  findByBookingReferenceAndEmailHash(
    bookingReference: string,
    contactEmailHash: string
  ): Promise<FlightOrderRecord | null>
  listByOwnerUserId(input: ListFlightOrdersByUserInput): Promise<FlightOrderListResult>
}

const inMemoryOrders = new Map<string, FlightOrderRecord>()
const inMemoryOrdersByCheckoutSession = new Map<string, string>()
const inMemoryOrdersByBookingReference = new Map<string, string>()

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
      inMemoryOrdersByBookingReference.set(record.bookingReference, record.id)
      return record
    }

    const [row] = await db
      .insert(flightOrders)
      .values({
        ...input,
        netAmount: toDbNumeric(input.netAmount),
        sellAmount: toDbNumeric(input.sellAmount),
        duffelTotalAmount: toDbNumeric(input.duffelTotalAmount),
        orderSnapshot: input.orderSnapshot,
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
  async findByBookingReference(bookingReference) {
    const db = getDbClient()

    if (!db) {
      const orderId = inMemoryOrdersByBookingReference.get(bookingReference)
      return orderId ? inMemoryOrders.get(orderId) ?? null : null
    }

    const row = await db.query.flightOrders.findFirst({
      where: eq(flightOrders.bookingReference, bookingReference),
    })

    return row ? toOrderRecord(row) : null
  },
  async findByBookingReferenceAndEmailHash(bookingReference, contactEmailHash) {
    const db = getDbClient()

    if (!db) {
      const orderId = inMemoryOrdersByBookingReference.get(bookingReference)
      const order = orderId ? inMemoryOrders.get(orderId) ?? null : null

      if (!order) {
        return null
      }

      return order.contactEmailHash === contactEmailHash ? order : null
    }

    const row = await db.query.flightOrders.findFirst({
      where: and(
        eq(flightOrders.bookingReference, bookingReference),
        eq(flightOrders.contactEmailHash, contactEmailHash)
      ),
    })

    return row ? toOrderRecord(row) : null
  },
  async listByOwnerUserId(input) {
    const db = getDbClient()

    if (!db) {
      const records = Array.from(inMemoryOrders.values())
        .filter((order) => order.ownerUserId === input.ownerUserId)
        .filter((order) => matchesStatusFilter(order, input.status))
        .filter((order) => matchesQuery(order, input.q))
        .sort((left, right) => compareOrdersForSort(left, right, input.sort))

      return {
        records: records.slice(input.offset, input.offset + input.limit),
        total: records.length,
      }
    }

    const ownerCondition = eq(flightOrders.ownerUserId, input.ownerUserId)
    const statusCondition = toStatusFilterCondition(input.status)
    const queryCondition = toQueryCondition(input.q)
    const whereCondition = and(ownerCondition, statusCondition, queryCondition)
    const orderBy = toOrderBy(input.sort)

    const [rows, totalRows] = await Promise.all([
      db.query.flightOrders.findMany({
        where: whereCondition,
        orderBy,
        limit: input.limit,
        offset: input.offset,
      }),
      db
        .select({ count: count() })
        .from(flightOrders)
        .where(whereCondition),
    ])

    return {
      records: rows.map(toOrderRecord),
      total: totalRows[0]?.count ?? 0,
    }
  },
}

function toOrderRecord(row: typeof flightOrders.$inferSelect): FlightOrderRecord {
  return {
    id: row.id,
    bookingReference: row.bookingReference,
    checkoutSessionId: row.checkoutSessionId,
    duffelOrderId: row.duffelOrderId,
    partialOfferRequestId: row.partialOfferRequestId,
    offerId: row.offerId,
    selectedPartialOffers: normalizeUnknownSelectedStrings(row.selectedPartialOffers),
    ownerUserId: row.ownerUserId,
    ownerGuestId: row.ownerGuestId,
    ownerOrgId: row.ownerOrgId,
    contactEmail: row.contactEmail,
    contactEmailHash: row.contactEmailHash,
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
    orderSnapshot: toOrderSnapshot(row.orderSnapshot),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDbNumeric(value: number) {
  return value.toFixed(4)
}

function matchesQuery(order: FlightOrderRecord, query: string | undefined) {
  if (!query) {
    return true
  }

  return order.bookingReference.toLowerCase().includes(query.toLowerCase())
}

function matchesStatusFilter(
  order: FlightOrderRecord,
  status: BookingListStatusFilter
) {
  switch (status) {
    case "confirmed":
      return order.paymentMode === "pay_now" && !order.paymentAwaiting
    case "payment_pending":
      return order.paymentMode === "pay_now" && order.paymentAwaiting
    case "on_hold":
      return order.paymentMode === "hold"
    case "all":
    default:
      return true
  }
}

function compareOrdersForSort(
  left: FlightOrderRecord,
  right: FlightOrderRecord,
  sort: BookingListSort
) {
  switch (sort) {
    case "oldest":
      return left.createdAt.getTime() - right.createdAt.getTime()
    case "amount_high":
      return right.sellAmount - left.sellAmount || right.createdAt.getTime() - left.createdAt.getTime()
    case "amount_low":
      return left.sellAmount - right.sellAmount || right.createdAt.getTime() - left.createdAt.getTime()
    case "newest":
    default:
      return right.createdAt.getTime() - left.createdAt.getTime()
  }
}

function toStatusFilterCondition(status: BookingListStatusFilter) {
  switch (status) {
    case "confirmed":
      return and(eq(flightOrders.paymentMode, "pay_now"), eq(flightOrders.paymentAwaiting, false))
    case "payment_pending":
      return and(eq(flightOrders.paymentMode, "pay_now"), eq(flightOrders.paymentAwaiting, true))
    case "on_hold":
      return eq(flightOrders.paymentMode, "hold")
    case "all":
    default:
      return undefined
  }
}

function toQueryCondition(query: string | undefined) {
  if (!query) {
    return undefined
  }

  return ilike(flightOrders.bookingReference, `%${query}%`)
}

function toOrderBy(sort: BookingListSort) {
  switch (sort) {
    case "oldest":
      return [asc(flightOrders.createdAt)]
    case "amount_high":
      return [desc(flightOrders.sellAmount), desc(flightOrders.createdAt)]
    case "amount_low":
      return [asc(flightOrders.sellAmount), desc(flightOrders.createdAt)]
    case "newest":
    default:
      return [desc(flightOrders.createdAt)]
  }
}

function toOrderSnapshot(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

export function resetInMemoryFlightOrdersForTests() {
  inMemoryOrders.clear()
  inMemoryOrdersByCheckoutSession.clear()
  inMemoryOrdersByBookingReference.clear()
}
