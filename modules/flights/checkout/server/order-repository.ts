import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  type SQLWrapper,
} from "drizzle-orm"

import { flightCancellationRequests, flightOrders, getDbClient } from "@/lib/db"
import { normalizeUnknownSelectedStrings } from "@/lib/shared/selection"
import type { FlightCancellationStatus } from "@/modules/flights/cancellations/domain"
import type {
  BookingListSort,
  BookingListStatusFilter,
} from "@/modules/flights/orders/domain"

export interface FlightOrderRecord {
  id: string
  bookingReference: string
  checkoutSessionId: string
  paymentAttemptId?: string | null
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
  paymentAttemptId?: string | null
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

export type AdminBookingStatusFilter =
  | "all"
  | "confirmed"
  | "payment_pending"
  | "on_hold"
  | "cancellation_in_progress"
  | "cancelled"

export interface ListAdminFlightOrdersInput {
  limit: number
  offset: number
  q?: string
  status: AdminBookingStatusFilter
  sort: BookingListSort
}

export interface AdminFlightOrderListRecord {
  order: FlightOrderRecord
  cancellationStatus: FlightCancellationStatus | null
  cancellationRequestId: string | null
}

export interface AdminFlightOrderListResult {
  records: AdminFlightOrderListRecord[]
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
  updateOrderSnapshot?(input: { id: string; orderSnapshot: Record<string, unknown> }): Promise<FlightOrderRecord | null>
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
        paymentAttemptId: input.paymentAttemptId ?? null,
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
        paymentAttemptId: input.paymentAttemptId ?? null,
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
  async updateOrderSnapshot(input) {
    const db = getDbClient()
    const now = new Date()
    if (!db) {
      const current = inMemoryOrders.get(input.id)
      if (!current) return null
      const updated = { ...current, orderSnapshot: input.orderSnapshot, updatedAt: now }
      inMemoryOrders.set(input.id, updated)
      return updated
    }
    const [row] = await db.update(flightOrders).set({ orderSnapshot: input.orderSnapshot, updatedAt: now }).where(eq(flightOrders.id, input.id)).returning()
    return row ? toOrderRecord(row) : null
  },
}

const cancellationInProgressStatuses: FlightCancellationStatus[] = [
  "requested",
  "quote_pending",
  "quote_ready",
  "admin_review_required",
  "duffel_confirming",
  "manual_processing",
]

const cancelledStatuses: FlightCancellationStatus[] = [
  "duffel_cancelled",
  "refund_pending",
  "refund_completed",
  "completed",
]

export async function listAdminFlightOrders(
  input: ListAdminFlightOrdersInput
): Promise<AdminFlightOrderListResult> {
  const db = getDbClient()

  if (!db) {
    const records = Array.from(inMemoryOrders.values())
      .map((order) => ({
        order,
        cancellationStatus: null,
        cancellationRequestId: null,
      }))
      .filter((record) => matchesAdminStatusFilter(record, input.status))
      .filter((record) => matchesAdminQuery(record.order, input.q))
      .sort((left, right) =>
        compareOrdersForSort(left.order, right.order, input.sort)
      )

    return {
      records: records.slice(input.offset, input.offset + input.limit),
      total: records.length,
    }
  }

  // Keep the outer order relationship explicit. A scalar correlated subquery
  // can emit an unqualified `id` here, which PostgreSQL binds to the inner
  // cancellation table and silently returns no matching status.
  const latestCancellation = db
    .selectDistinctOn([flightCancellationRequests.flightOrderId], {
      flightOrderId: flightCancellationRequests.flightOrderId,
      status: flightCancellationRequests.status,
      requestId: flightCancellationRequests.id,
    })
    .from(flightCancellationRequests)
    .orderBy(
      flightCancellationRequests.flightOrderId,
      desc(flightCancellationRequests.createdAt)
    )
    .as("latest_flight_cancellation")
  const statusCondition = toAdminStatusFilterCondition(
    input.status,
    latestCancellation.status
  )
  const queryCondition = toAdminQueryCondition(input.q)
  const whereCondition = and(statusCondition, queryCondition)
  const orderBy = toOrderBy(input.sort)

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        order: flightOrders,
        cancellationStatus: latestCancellation.status,
        cancellationRequestId: latestCancellation.requestId,
      })
      .from(flightOrders)
      .leftJoin(
        latestCancellation,
        eq(latestCancellation.flightOrderId, flightOrders.id)
      )
      .where(whereCondition)
      .orderBy(...orderBy)
      .limit(input.limit)
      .offset(input.offset),
    db
      .select({ count: count() })
      .from(flightOrders)
      .leftJoin(
        latestCancellation,
        eq(latestCancellation.flightOrderId, flightOrders.id)
      )
      .where(whereCondition),
  ])

  return {
    records: rows.map((row) => ({
      order: toOrderRecord(row.order),
      cancellationStatus: row.cancellationStatus,
      cancellationRequestId: row.cancellationRequestId,
    })),
    total: totalRows[0]?.count ?? 0,
  }
}

function toOrderRecord(row: typeof flightOrders.$inferSelect): FlightOrderRecord {
  return {
    id: row.id,
    bookingReference: row.bookingReference,
    checkoutSessionId: row.checkoutSessionId,
    paymentAttemptId: row.paymentAttemptId,
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

function matchesAdminQuery(order: FlightOrderRecord, query: string | undefined) {
  if (!query) {
    return true
  }

  const normalizedQuery = query.toLowerCase()
  const snapshot = toOrderSnapshot(order.orderSnapshot)
  const searchableValues = [
    order.bookingReference,
    order.contactEmail,
    order.duffelOrderId,
    order.checkoutSessionId,
    typeof snapshot.routeLabel === "string" ? snapshot.routeLabel : "",
    typeof snapshot.airlineBookingReference === "string"
      ? snapshot.airlineBookingReference
      : "",
  ]

  return searchableValues.some((value) =>
    value.toLowerCase().includes(normalizedQuery)
  )
}

function matchesAdminStatusFilter(
  record: AdminFlightOrderListRecord,
  status: AdminBookingStatusFilter
) {
  if (
    record.cancellationStatus &&
    cancelledStatuses.includes(record.cancellationStatus)
  ) {
    return status === "all" || status === "cancelled"
  }

  if (
    record.cancellationStatus &&
    cancellationInProgressStatuses.includes(record.cancellationStatus)
  ) {
    return status === "all" || status === "cancellation_in_progress"
  }

  if (status === "cancellation_in_progress" || status === "cancelled") {
    return false
  }

  return status === "all" || matchesStatusFilter(record.order, status)
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

function toAdminQueryCondition(query: string | undefined) {
  if (!query) {
    return undefined
  }

  const pattern = `%${query}%`
  return or(
    ilike(flightOrders.bookingReference, pattern),
    ilike(flightOrders.contactEmail, pattern),
    ilike(flightOrders.duffelOrderId, pattern),
    ilike(flightOrders.checkoutSessionId, pattern),
    sql`${flightOrders.orderSnapshot} ->> 'routeLabel' ilike ${pattern}`,
    sql`${flightOrders.orderSnapshot} ->> 'airlineBookingReference' ilike ${pattern}`
  )
}

function toAdminStatusFilterCondition(
  status: AdminBookingStatusFilter,
  latestCancellationStatus: SQLWrapper
) {
  if (status === "cancelled") {
    return inArray(latestCancellationStatus, cancelledStatuses)
  }

  if (status === "cancellation_in_progress") {
    return inArray(latestCancellationStatus, cancellationInProgressStatuses)
  }

  if (status === "all") {
    return undefined
  }

  const noActiveCancellation = or(
    isNull(latestCancellationStatus),
    notInArray(latestCancellationStatus, [
      ...cancelledStatuses,
      ...cancellationInProgressStatuses,
    ])
  )

  return and(noActiveCancellation, toStatusFilterCondition(status))
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
