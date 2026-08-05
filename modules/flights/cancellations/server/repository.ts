import "server-only"

import { randomUUID } from "node:crypto"

import { desc, eq } from "drizzle-orm"

import {
  businessSettings,
  flightCancellationEvents,
  flightCancellationQuotes,
  flightCancellationRequests,
  flightOrders,
  flightRefundAttempts,
  getDbClient,
  paymentAttempts,
  type BusinessSettingsRow,
  type FlightCancellationEventRow,
  type FlightCancellationQuoteRow,
  type FlightCancellationRequestRow,
  type FlightOrderRow,
  type FlightRefundAttemptRow,
  type NewBusinessSettingsRow,
  type NewFlightCancellationEventRow,
  type NewFlightCancellationQuoteRow,
  type NewFlightRefundAttemptRow,
  type PaymentAttemptRow,
} from "@/lib/db"
import {
  isActiveCancellationStatus,
  type FlightCancellationEventActorType,
  type FlightCancellationFeeType,
  type FlightCancellationStatus,
  type FlightRefundStatus,
} from "@/modules/flights/cancellations/domain"

export interface CancellationRequestRecord
  extends Omit<FlightCancellationRequestRow, "adminFeeValue" | "adminFeeAmount" | "customerRefundAmount"> {
  adminFeeValue: number
  adminFeeAmount: number
  customerRefundAmount: number | null
}

export interface CancellationQuoteRecord
  extends Omit<FlightCancellationQuoteRow, "refundAmount"> {
  refundAmount: number | null
}

export interface RefundAttemptRecord
  extends Omit<FlightRefundAttemptRow, "amount"> {
  amount: number
}

export interface CancellationDetailRecord {
  request: CancellationRequestRecord
  order: FlightOrderRow
  paymentAttempt: PaymentAttemptRow | null
  quotes: CancellationQuoteRecord[]
  refunds: RefundAttemptRecord[]
  events: FlightCancellationEventRow[]
}

export interface CancellationQueueItemRecord {
  request: CancellationRequestRecord
  order: FlightOrderRow
}

export interface CreateCancellationRequestRepositoryInput {
  flightOrderId: string
  bookingReference: string
  duffelOrderId: string
  requestedByUserId: string | null
  requestedByGuestId: string | null
  customerReason: string
  duffelApiAvailable: boolean | null
  adminFeeType: FlightCancellationFeeType
  adminFeeValue: number
  adminFeeAmount: number
  customerRefundAmount: number | null
  customerRefundCurrency: string | null
  customerMessage: string | null
  status?: FlightCancellationStatus
}

export interface UpdateCancellationRequestInput {
  status?: FlightCancellationStatus
  duffelApiAvailable?: boolean | null
  adminFeeType?: FlightCancellationFeeType
  adminFeeValue?: number
  adminFeeAmount?: number
  customerRefundAmount?: number | null
  customerRefundCurrency?: string | null
  customerMessage?: string | null
  customerMessageUpdatedBy?: string | null
  customerMessageUpdatedAt?: Date | null
  cutoffOverrideBy?: string | null
  cutoffOverrideAt?: Date | null
  cutoffOverrideReason?: string | null
  cancellationApprovedBy?: string | null
  cancellationApprovedAt?: Date | null
  refundApprovedBy?: string | null
  refundApprovedAt?: Date | null
  adminRejectionReason?: string | null
  rejectedAt?: Date | null
}

export interface CancellationRepository {
  createRequest(
    input: CreateCancellationRequestRepositoryInput
  ): Promise<CancellationRequestRecord>
  updateRequest(
    requestId: string,
    patch: UpdateCancellationRequestInput
  ): Promise<CancellationRequestRecord | null>
  findRequestById(requestId: string): Promise<CancellationRequestRecord | null>
  findLatestRequestByFlightOrderId(
    flightOrderId: string
  ): Promise<CancellationRequestRecord | null>
  findActiveRequestByFlightOrderId(
    flightOrderId: string
  ): Promise<CancellationRequestRecord | null>
  findLatestRejectedRequestByFlightOrderId(
    flightOrderId: string
  ): Promise<CancellationRequestRecord | null>
  listRequests(input: { limit: number; offset: number }): Promise<CancellationQueueItemRecord[]>
  getDetail(requestId: string): Promise<CancellationDetailRecord | null>
  addEvent(input: {
    cancellationRequestId: string
    actorType: FlightCancellationEventActorType
    actorId: string | null
    eventType: string
    message?: string | null
    metadata?: unknown
  }): Promise<FlightCancellationEventRow>
  createQuote(input: {
    cancellationRequestId: string
    duffelOrderCancellationId: string
    refundAmount: number | null
    refundCurrency: string | null
    refundTo: string | null
    expiresAt: Date | null
    confirmedAt: Date | null
    rawPayload?: unknown
  }): Promise<CancellationQuoteRecord>
  markQuoteConfirmed(input: {
    quoteId: string
    confirmedAt: Date
    rawPayload?: unknown
  }): Promise<CancellationQuoteRecord | null>
  createRefundAttempt(input: {
    cancellationRequestId: string
    paymentAttemptId: string | null
    provider: "paypal"
    providerCaptureId: string | null
    amount: number
    currency: string
    status: FlightRefundStatus
    rawPayload?: unknown
  }): Promise<RefundAttemptRecord>
  updateRefundAttempt(input: {
    refundAttemptId: string
    providerRefundId?: string | null
    status?: FlightRefundStatus
    rawPayload?: unknown
  }): Promise<RefundAttemptRecord | null>
  getBusinessSettings(): Promise<BusinessSettingsRow>
  updateBusinessSettings(input: {
    businessName: string
    supportEmail: string
    supportPhone: string
    supportWhatsapp: string
    address: string
    timezone: string
    updatedBy: string
  }): Promise<BusinessSettingsRow>
}

const requestStore = new Map<string, CancellationRequestRecord>()
const quoteStore = new Map<string, CancellationQuoteRecord>()
const eventStore = new Map<string, FlightCancellationEventRow>()
const refundStore = new Map<string, RefundAttemptRecord>()
let businessSettingsStore: BusinessSettingsRow | null = null

export const defaultCancellationRepository: CancellationRepository = {
  async createRequest(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      const record: CancellationRequestRecord = {
        id: createCancellationRequestId(),
        ...input,
        status: input.status ?? "requested",
        customerMessageUpdatedBy: null,
        customerMessageUpdatedAt: null,
        cutoffOverrideBy: null,
        cutoffOverrideAt: null,
        cutoffOverrideReason: null,
        cancellationApprovedBy: null,
        cancellationApprovedAt: null,
        refundApprovedBy: null,
        refundApprovedAt: null,
        adminRejectionReason: null,
        rejectedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      requestStore.set(record.id, record)
      return record
    }

    const [row] = await db
      .insert(flightCancellationRequests)
      .values({
        id: createCancellationRequestId(),
        ...input,
        status: input.status ?? "requested",
        adminFeeValue: toDbNumeric(input.adminFeeValue),
        adminFeeAmount: toDbNumeric(input.adminFeeAmount),
        customerRefundAmount:
          input.customerRefundAmount === null
            ? null
            : toDbNumeric(input.customerRefundAmount),
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return toRequestRecord(row)
  },
  async updateRequest(requestId, patch) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      const existing = requestStore.get(requestId)
      if (!existing) {
        return null
      }
      const updated = {
        ...existing,
        ...patch,
        updatedAt: now,
      }
      requestStore.set(requestId, updated)
      return updated
    }

    const [row] = await db
      .update(flightCancellationRequests)
      .set({
        ...toDbRequestPatch(patch),
        updatedAt: now,
      })
      .where(eq(flightCancellationRequests.id, requestId))
      .returning()

    return row ? toRequestRecord(row) : null
  },
  async findRequestById(requestId) {
    const db = getDbClient()

    if (!db) {
      return requestStore.get(requestId) ?? null
    }

    const row = await db.query.flightCancellationRequests.findFirst({
      where: eq(flightCancellationRequests.id, requestId),
    })
    return row ? toRequestRecord(row) : null
  },
  async findLatestRequestByFlightOrderId(flightOrderId) {
    const db = getDbClient()

    if (!db) {
      return [...requestStore.values()]
        .filter((request) => request.flightOrderId === flightOrderId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null
    }

    const row = await db.query.flightCancellationRequests.findFirst({
      where: eq(flightCancellationRequests.flightOrderId, flightOrderId),
      orderBy: [desc(flightCancellationRequests.createdAt)],
    })
    return row ? toRequestRecord(row) : null
  },
  async findActiveRequestByFlightOrderId(flightOrderId) {
    const latest = await this.findLatestRequestByFlightOrderId(flightOrderId)
    return latest && isActiveCancellationStatus(latest.status) ? latest : null
  },
  async findLatestRejectedRequestByFlightOrderId(flightOrderId) {
    const db = getDbClient()

    if (!db) {
      return [...requestStore.values()]
        .filter(
          (request) =>
            request.flightOrderId === flightOrderId &&
            request.status === "rejected"
        )
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null
    }

    const row = await db.query.flightCancellationRequests.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.flightOrderId, flightOrderId), eq(table.status, "rejected")),
      orderBy: [desc(flightCancellationRequests.createdAt)],
    })
    return row ? toRequestRecord(row) : null
  },
  async listRequests(input) {
    const db = getDbClient()

    if (!db) {
      return [...requestStore.values()]
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
        .slice(input.offset, input.offset + input.limit)
        .map((request) => ({
          request,
          order: createOrderFallback(request),
        }))
    }

    const rows = await db
      .select({ request: flightCancellationRequests, order: flightOrders })
      .from(flightCancellationRequests)
      .innerJoin(
        flightOrders,
        eq(flightCancellationRequests.flightOrderId, flightOrders.id)
      )
      .orderBy(desc(flightCancellationRequests.updatedAt))
      .limit(input.limit)
      .offset(input.offset)

    return rows.map((row) => ({
      request: toRequestRecord(row.request),
      order: row.order,
    }))
  },
  async getDetail(requestId) {
    const db = getDbClient()
    const request = await this.findRequestById(requestId)

    if (!request) {
      return null
    }

    if (!db) {
      return {
        request,
        order: createOrderFallback(request),
        paymentAttempt: null,
        quotes: [...quoteStore.values()]
          .filter((quote) => quote.cancellationRequestId === requestId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
        refunds: [...refundStore.values()].filter(
          (refund) => refund.cancellationRequestId === requestId
        ),
        events: [...eventStore.values()]
          .filter((event) => event.cancellationRequestId === requestId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
      }
    }

    const order = await db.query.flightOrders.findFirst({
      where: eq(flightOrders.id, request.flightOrderId),
    })

    if (!order) {
      return null
    }

    const [paymentAttempt, quotes, refunds, events] = await Promise.all([
      order.paymentAttemptId
        ? db.query.paymentAttempts.findFirst({
            where: eq(paymentAttempts.id, order.paymentAttemptId),
          }).then((row) => row ?? null)
        : Promise.resolve(null),
      db.query.flightCancellationQuotes.findMany({
        where: eq(flightCancellationQuotes.cancellationRequestId, requestId),
        orderBy: [desc(flightCancellationQuotes.createdAt)],
      }),
      db.query.flightRefundAttempts.findMany({
        where: eq(flightRefundAttempts.cancellationRequestId, requestId),
        orderBy: [desc(flightRefundAttempts.createdAt)],
      }),
      db.query.flightCancellationEvents.findMany({
        where: eq(flightCancellationEvents.cancellationRequestId, requestId),
        orderBy: [desc(flightCancellationEvents.createdAt)],
      }),
    ])

    return {
      request,
      order,
      paymentAttempt,
      quotes: quotes.map(toQuoteRecord),
      refunds: refunds.map(toRefundRecord),
      events,
    }
  },
  async addEvent(input) {
    const db = getDbClient()
    const now = new Date()
    const id = createCancellationEventId()

    if (!db) {
      const event: FlightCancellationEventRow = {
        id,
        cancellationRequestId: input.cancellationRequestId,
        actorType: input.actorType,
        actorId: input.actorId,
        eventType: input.eventType,
        message: input.message ?? null,
        metadata: input.metadata ?? null,
        createdAt: now,
      }
      eventStore.set(id, event)
      return event
    }

    const values: NewFlightCancellationEventRow = {
      id,
      cancellationRequestId: input.cancellationRequestId,
      actorType: input.actorType,
      actorId: input.actorId,
      eventType: input.eventType,
      message: input.message ?? null,
      metadata: input.metadata ?? null,
      createdAt: now,
    }
    const [row] = await db.insert(flightCancellationEvents).values(values).returning()
    return row
  },
  async createQuote(input) {
    const db = getDbClient()
    const now = new Date()
    const id = createCancellationQuoteId()

    if (!db) {
      const quote: CancellationQuoteRecord = {
        id,
        cancellationRequestId: input.cancellationRequestId,
        duffelOrderCancellationId: input.duffelOrderCancellationId,
        refundAmount: input.refundAmount,
        refundCurrency: input.refundCurrency,
        refundTo: input.refundTo,
        expiresAt: input.expiresAt,
        confirmedAt: input.confirmedAt,
        rawPayload: input.rawPayload ?? null,
        createdAt: now,
      }
      quoteStore.set(id, quote)
      return quote
    }

    const values: NewFlightCancellationQuoteRow = {
      id,
      cancellationRequestId: input.cancellationRequestId,
      duffelOrderCancellationId: input.duffelOrderCancellationId,
      refundAmount:
        input.refundAmount === null ? null : toDbNumeric(input.refundAmount),
      refundCurrency: input.refundCurrency,
      refundTo: input.refundTo,
      expiresAt: input.expiresAt,
      confirmedAt: input.confirmedAt,
      rawPayload: input.rawPayload ?? null,
      createdAt: now,
    }
    const [row] = await db.insert(flightCancellationQuotes).values(values).returning()
    return toQuoteRecord(row)
  },
  async markQuoteConfirmed(input) {
    const db = getDbClient()

    if (!db) {
      const current = quoteStore.get(input.quoteId)
      if (!current) {
        return null
      }
      const updated: CancellationQuoteRecord = {
        ...current,
        confirmedAt: input.confirmedAt,
        rawPayload: input.rawPayload ?? current.rawPayload,
      }
      quoteStore.set(input.quoteId, updated)
      return updated
    }

    const [row] = await db
      .update(flightCancellationQuotes)
      .set({
        confirmedAt: input.confirmedAt,
        rawPayload: input.rawPayload,
      })
      .where(eq(flightCancellationQuotes.id, input.quoteId))
      .returning()
    return row ? toQuoteRecord(row) : null
  },
  async createRefundAttempt(input) {
    const db = getDbClient()
    const now = new Date()
    const id = createRefundAttemptId()

    if (!db) {
      const refund: RefundAttemptRecord = {
        id,
        cancellationRequestId: input.cancellationRequestId,
        paymentAttemptId: input.paymentAttemptId,
        provider: input.provider,
        providerCaptureId: input.providerCaptureId,
        providerRefundId: null,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        rawPayload: input.rawPayload ?? null,
        createdAt: now,
        updatedAt: now,
      }
      refundStore.set(id, refund)
      return refund
    }

    const values: NewFlightRefundAttemptRow = {
      id,
      cancellationRequestId: input.cancellationRequestId,
      paymentAttemptId: input.paymentAttemptId,
      provider: input.provider,
      providerCaptureId: input.providerCaptureId,
      amount: toDbNumeric(input.amount),
      currency: input.currency,
      status: input.status,
      rawPayload: input.rawPayload ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const [row] = await db.insert(flightRefundAttempts).values(values).returning()
    return toRefundRecord(row)
  },
  async updateRefundAttempt(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      const current = refundStore.get(input.refundAttemptId)
      if (!current) {
        return null
      }
      const updated: RefundAttemptRecord = {
        ...current,
        providerRefundId:
          input.providerRefundId === undefined
            ? current.providerRefundId
            : input.providerRefundId,
        status: input.status ?? current.status,
        rawPayload:
          input.rawPayload === undefined ? current.rawPayload : input.rawPayload,
        updatedAt: now,
      }
      refundStore.set(input.refundAttemptId, updated)
      return updated
    }

    const patch: Record<string, unknown> = { updatedAt: now }
    if (input.providerRefundId !== undefined) {
      patch.providerRefundId = input.providerRefundId
    }
    if (input.status !== undefined) {
      patch.status = input.status
    }
    if (input.rawPayload !== undefined) {
      patch.rawPayload = input.rawPayload
    }

    const [row] = await db
      .update(flightRefundAttempts)
      .set(patch)
      .where(eq(flightRefundAttempts.id, input.refundAttemptId))
      .returning()
    return row ? toRefundRecord(row) : null
  },
  async getBusinessSettings() {
    const db = getDbClient()

    if (!db) {
      if (!businessSettingsStore) {
        businessSettingsStore = createDefaultBusinessSettingsRow()
      }
      return businessSettingsStore
    }

    const existing = await db.query.businessSettings.findFirst({
      orderBy: [desc(businessSettings.updatedAt)],
    })

    if (existing) {
      return existing
    }

    const [created] = await db
      .insert(businessSettings)
      .values(createDefaultBusinessSettingsInsert())
      .returning()
    return created
  },
  async updateBusinessSettings(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      const existing = businessSettingsStore ?? createDefaultBusinessSettingsRow()
      businessSettingsStore = {
        ...existing,
        ...input,
        updatedAt: now,
      }
      return businessSettingsStore
    }

    const current = await this.getBusinessSettings()
    const [updated] = await db
      .update(businessSettings)
      .set({
        businessName: input.businessName,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        supportWhatsapp: input.supportWhatsapp,
        address: input.address,
        timezone: input.timezone,
        updatedBy: input.updatedBy,
        updatedAt: now,
      })
      .where(eq(businessSettings.id, current.id))
      .returning()
    return updated
  },
}

function toRequestRecord(
  row: typeof flightCancellationRequests.$inferSelect
): CancellationRequestRecord {
  return {
    ...row,
    adminFeeValue: Number(row.adminFeeValue),
    adminFeeAmount: Number(row.adminFeeAmount),
    customerRefundAmount:
      row.customerRefundAmount === null ? null : Number(row.customerRefundAmount),
  }
}

function toQuoteRecord(
  row: typeof flightCancellationQuotes.$inferSelect
): CancellationQuoteRecord {
  return {
    ...row,
    refundAmount: row.refundAmount === null ? null : Number(row.refundAmount),
  }
}

function toRefundRecord(
  row: typeof flightRefundAttempts.$inferSelect
): RefundAttemptRecord {
  return {
    ...row,
    amount: Number(row.amount),
  }
}

function toDbRequestPatch(patch: UpdateCancellationRequestInput) {
  const output: Record<string, unknown> = { ...patch }

  if (patch.adminFeeValue !== undefined) {
    output.adminFeeValue = toDbNumeric(patch.adminFeeValue)
  }
  if (patch.adminFeeAmount !== undefined) {
    output.adminFeeAmount = toDbNumeric(patch.adminFeeAmount)
  }
  if (patch.customerRefundAmount !== undefined) {
    output.customerRefundAmount =
      patch.customerRefundAmount === null
        ? null
        : toDbNumeric(patch.customerRefundAmount)
  }

  return output
}

function toDbNumeric(value: number) {
  return value.toFixed(4)
}

function createDefaultBusinessSettingsInsert(): NewBusinessSettingsRow {
  const now = new Date()

  return {
    id: "default",
    businessName: process.env.BUSINESS_NAME || "Vacatina",
    supportEmail: process.env.SUPPORT_EMAIL || "support@vacatina.example",
    supportPhone: process.env.SUPPORT_PHONE || "+1 000 000 0000",
    supportWhatsapp: process.env.SUPPORT_WHATSAPP || "+1 000 000 0000",
    address: process.env.BUSINESS_ADDRESS || "Vacatina Support",
    timezone: process.env.BUSINESS_TIMEZONE || "UTC",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
  }
}

function createDefaultBusinessSettingsRow(): BusinessSettingsRow {
  return createDefaultBusinessSettingsInsert() as BusinessSettingsRow
}

function createOrderFallback(request: CancellationRequestRecord): FlightOrderRow {
  const now = new Date()

  return {
    id: request.flightOrderId,
    bookingReference: request.bookingReference,
    checkoutSessionId: "",
    paymentAttemptId: null,
    duffelOrderId: request.duffelOrderId,
    partialOfferRequestId: "",
    offerId: "",
    selectedPartialOffers: [],
    ownerUserId: request.requestedByUserId,
    ownerGuestId: request.requestedByGuestId,
    ownerOrgId: null,
    contactEmail: "customer@example.com",
    contactEmailHash: "",
    paymentMode: "pay_now",
    settlementType: "balance",
    currency: request.customerRefundCurrency ?? "USD",
    netAmount: "0",
    sellAmount: "0",
    duffelTotalAmount: "0",
    duffelTotalCurrency: request.customerRefundCurrency ?? "USD",
    paymentAwaiting: false,
    paymentRequiredBy: null,
    priceGuaranteeExpiresAt: null,
    paidAt: now,
    orderSnapshot: {},
    createdAt: now,
    updatedAt: now,
  }
}

function createCancellationRequestId() {
  return `fcr_${randomUUID().replaceAll("-", "")}`
}

function createCancellationEventId() {
  return `fce_${randomUUID().replaceAll("-", "")}`
}

function createCancellationQuoteId() {
  return `fcq_${randomUUID().replaceAll("-", "")}`
}

function createRefundAttemptId() {
  return `fra_${randomUUID().replaceAll("-", "")}`
}

export function resetCancellationRepositoryInMemoryStateForTests() {
  requestStore.clear()
  quoteStore.clear()
  eventStore.clear()
  refundStore.clear()
  businessSettingsStore = null
}
