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
  or,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm"

import {
  checkoutSessions,
  flightCancellationRequests,
  flightOrders,
  flightRefundAttempts,
  getDbClient,
  paymentAttempts,
  paymentEvents,
  paymentOutbox,
  paymentWebhookInbox,
  type CheckoutSessionRow,
  type FlightOrderRow,
  type FlightRefundAttemptRow,
  type PaymentAttemptRow,
  type PaymentEventRow,
  type PaymentOutboxRow,
  type PaymentWebhookInboxRow,
} from "@/lib/db"
import type { AdminPaymentListQuery } from "@/modules/payments/domain"

const paidStatuses = [
  "capture_completed",
  "fulfillment_pending",
  "fulfilled",
] as const

const pendingStatuses = [
  "created",
  "provider_order_created",
  "buyer_approved",
  "capture_pending",
] as const

const attentionStatuses = [
  "capture_denied",
  "capture_failed",
  "reversed",
  "disputed",
  "reconciliation_required",
] as const

const pendingRefundStatuses = ["pending", "approved", "processing"] as const

export interface AdminPaymentRepositoryRecord {
  attempt: PaymentAttemptRow
  checkoutSession: CheckoutSessionRow | null
  order: FlightOrderRow | null
  cancellationRequestId: string | null
  cancellationStatus: string | null
  refund: FlightRefundAttemptRow | null
}

export interface AdminPaymentSummaryRecord {
  total: number
  settled: number
  needsAttention: number
  refundsPending: number
}

export interface AdminPaymentDetailRecord extends AdminPaymentRepositoryRecord {
  events: PaymentEventRow[]
  refunds: FlightRefundAttemptRow[]
  outboxTasks: PaymentOutboxRow[]
  webhooks: PaymentWebhookInboxRow[]
}

export async function listAdminPaymentRecords(
  input: AdminPaymentListQuery
): Promise<{ records: AdminPaymentRepositoryRecord[]; total: number }> {
  const db = getDbClient()

  if (!db) {
    return { records: [], total: 0 }
  }

  const latestCancellation = latestCancellationSubquery(db)
  const latestRefund = latestRefundSubquery(db)
  const whereCondition = and(
    toSearchCondition(input.q),
    toPaymentStatusCondition(input.paymentStatus, latestRefund.status),
    toRefundStatusCondition(
      input.refundStatus,
      latestRefund.id,
      latestRefund.status
    )
  )
  const joins = {
    latestCancellation,
    latestRefund,
  }

  const [rows, totalRows] = await Promise.all([
    selectPaymentRows(db, joins)
      .where(whereCondition)
      .orderBy(...toOrderBy(input.sort))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    db
      .select({ count: count() })
      .from(paymentAttempts)
      .leftJoin(
        checkoutSessions,
        or(
          eq(checkoutSessions.paymentAttemptId, paymentAttempts.id),
          eq(checkoutSessions.id, paymentAttempts.internalOrderId)
        )
      )
      .leftJoin(
        flightOrders,
        or(
          eq(flightOrders.paymentAttemptId, paymentAttempts.id),
          eq(flightOrders.checkoutSessionId, checkoutSessions.id)
        )
      )
      .leftJoin(
        latestCancellation,
        eq(latestCancellation.flightOrderId, flightOrders.id)
      )
      .leftJoin(
        latestRefund,
        eq(latestRefund.cancellationRequestId, latestCancellation.requestId)
      )
      .where(whereCondition),
  ])

  return {
    records: rows.map(toRepositoryRecord),
    total: totalRows[0]?.count ?? 0,
  }
}

export async function getAdminPaymentSummary(): Promise<AdminPaymentSummaryRecord> {
  const db = getDbClient()

  if (!db) {
    return { total: 0, settled: 0, needsAttention: 0, refundsPending: 0 }
  }

  const [totalRows, settledRows, attentionRows, refundRows] = await Promise.all(
    [
      db.select({ count: count() }).from(paymentAttempts),
      db
        .select({ count: count() })
        .from(paymentAttempts)
        .where(inArray(paymentAttempts.status, [...paidStatuses])),
      db
        .select({ count: count() })
        .from(paymentAttempts)
        .where(inArray(paymentAttempts.status, [...attentionStatuses])),
      db
        .select({ count: count() })
        .from(flightRefundAttempts)
        .where(
          inArray(flightRefundAttempts.status, [...pendingRefundStatuses])
        ),
    ]
  )

  return {
    total: totalRows[0]?.count ?? 0,
    settled: settledRows[0]?.count ?? 0,
    needsAttention: attentionRows[0]?.count ?? 0,
    refundsPending: refundRows[0]?.count ?? 0,
  }
}

export async function getAdminPaymentDetailRecord(
  paymentAttemptId: string
): Promise<AdminPaymentDetailRecord | null> {
  const db = getDbClient()

  if (!db) {
    return null
  }

  const latestCancellation = latestCancellationSubquery(db)
  const latestRefund = latestRefundSubquery(db)
  const [row] = await selectPaymentRows(db, {
    latestCancellation,
    latestRefund,
  }).where(eq(paymentAttempts.id, paymentAttemptId))

  if (!row) {
    return null
  }

  const base = toRepositoryRecord(row)
  const [events, refunds, outboxTasks, webhooks] = await Promise.all([
    db.query.paymentEvents.findMany({
      where: eq(paymentEvents.paymentAttemptId, paymentAttemptId),
      orderBy: [desc(paymentEvents.createdAt)],
      limit: 100,
    }),
    base.cancellationRequestId
      ? db.query.flightRefundAttempts.findMany({
          where: eq(
            flightRefundAttempts.cancellationRequestId,
            base.cancellationRequestId
          ),
          orderBy: [desc(flightRefundAttempts.createdAt)],
        })
      : Promise.resolve([]),
    db.query.paymentOutbox.findMany({
      where: eq(paymentOutbox.paymentAttemptId, paymentAttemptId),
      orderBy: [desc(paymentOutbox.createdAt)],
      limit: 50,
    }),
    base.attempt.providerOrderId
      ? db.query.paymentWebhookInbox.findMany({
          where: eq(
            paymentWebhookInbox.providerOrderId,
            base.attempt.providerOrderId
          ),
          orderBy: [desc(paymentWebhookInbox.receivedAt)],
          limit: 50,
        })
      : Promise.resolve([]),
  ])

  return {
    ...base,
    events,
    refunds,
    outboxTasks,
    webhooks,
  }
}

function latestCancellationSubquery(
  db: NonNullable<ReturnType<typeof getDbClient>>
) {
  return db
    .selectDistinctOn([flightCancellationRequests.flightOrderId], {
      flightOrderId: flightCancellationRequests.flightOrderId,
      requestId: flightCancellationRequests.id,
      status: flightCancellationRequests.status,
    })
    .from(flightCancellationRequests)
    .orderBy(
      flightCancellationRequests.flightOrderId,
      desc(flightCancellationRequests.createdAt)
    )
    .as("latest_payment_cancellation")
}

function latestRefundSubquery(db: NonNullable<ReturnType<typeof getDbClient>>) {
  return db
    .selectDistinctOn([flightRefundAttempts.cancellationRequestId], {
      id: flightRefundAttempts.id,
      cancellationRequestId: flightRefundAttempts.cancellationRequestId,
      paymentAttemptId: flightRefundAttempts.paymentAttemptId,
      provider: flightRefundAttempts.provider,
      providerCaptureId: flightRefundAttempts.providerCaptureId,
      providerRefundId: flightRefundAttempts.providerRefundId,
      amount: flightRefundAttempts.amount,
      currency: flightRefundAttempts.currency,
      status: flightRefundAttempts.status,
      rawPayload: flightRefundAttempts.rawPayload,
      createdAt: flightRefundAttempts.createdAt,
      updatedAt: flightRefundAttempts.updatedAt,
    })
    .from(flightRefundAttempts)
    .orderBy(
      flightRefundAttempts.cancellationRequestId,
      desc(flightRefundAttempts.createdAt)
    )
    .as("latest_payment_refund")
}

function selectPaymentRows(
  db: NonNullable<ReturnType<typeof getDbClient>>,
  joins: {
    latestCancellation: ReturnType<typeof latestCancellationSubquery>
    latestRefund: ReturnType<typeof latestRefundSubquery>
  }
) {
  return db
    .select({
      attempt: paymentAttempts,
      checkoutSession: checkoutSessions,
      order: flightOrders,
      cancellationRequestId: joins.latestCancellation.requestId,
      cancellationStatus: joins.latestCancellation.status,
      refundId: joins.latestRefund.id,
      refundCancellationRequestId: joins.latestRefund.cancellationRequestId,
      refundPaymentAttemptId: joins.latestRefund.paymentAttemptId,
      refundProvider: joins.latestRefund.provider,
      refundProviderCaptureId: joins.latestRefund.providerCaptureId,
      refundProviderRefundId: joins.latestRefund.providerRefundId,
      refundAmount: joins.latestRefund.amount,
      refundCurrency: joins.latestRefund.currency,
      refundStatus: joins.latestRefund.status,
      refundRawPayload: joins.latestRefund.rawPayload,
      refundCreatedAt: joins.latestRefund.createdAt,
      refundUpdatedAt: joins.latestRefund.updatedAt,
    })
    .from(paymentAttempts)
    .leftJoin(
      checkoutSessions,
      or(
        eq(checkoutSessions.paymentAttemptId, paymentAttempts.id),
        eq(checkoutSessions.id, paymentAttempts.internalOrderId)
      )
    )
    .leftJoin(
      flightOrders,
      or(
        eq(flightOrders.paymentAttemptId, paymentAttempts.id),
        eq(flightOrders.checkoutSessionId, checkoutSessions.id)
      )
    )
    .leftJoin(
      joins.latestCancellation,
      eq(joins.latestCancellation.flightOrderId, flightOrders.id)
    )
    .leftJoin(
      joins.latestRefund,
      eq(
        joins.latestRefund.cancellationRequestId,
        joins.latestCancellation.requestId
      )
    )
}

function toRepositoryRecord(row: {
  attempt: PaymentAttemptRow
  checkoutSession: CheckoutSessionRow | null
  order: FlightOrderRow | null
  cancellationRequestId: string | null
  cancellationStatus: string | null
  refundId: string | null
  refundCancellationRequestId: string | null
  refundPaymentAttemptId: string | null
  refundProvider: "paypal" | null
  refundProviderCaptureId: string | null
  refundProviderRefundId: string | null
  refundAmount: string | null
  refundCurrency: string | null
  refundStatus:
    | "pending"
    | "approved"
    | "processing"
    | "completed"
    | "failed"
    | "manual_completed"
    | null
  refundRawPayload: unknown
  refundCreatedAt: Date | null
  refundUpdatedAt: Date | null
}): AdminPaymentRepositoryRecord {
  const {
    refundId,
    refundCancellationRequestId,
    refundPaymentAttemptId,
    refundProvider,
    refundProviderCaptureId,
    refundProviderRefundId,
    refundAmount,
    refundCurrency,
    refundStatus,
    refundRawPayload,
    refundCreatedAt,
    refundUpdatedAt,
    ...base
  } = row

  const refund =
    refundId &&
    refundCancellationRequestId &&
    refundProvider &&
    refundAmount !== null &&
    refundCurrency &&
    refundStatus &&
    refundCreatedAt &&
    refundUpdatedAt
      ? {
          id: refundId,
          cancellationRequestId: refundCancellationRequestId,
          paymentAttemptId: refundPaymentAttemptId,
          provider: refundProvider,
          providerCaptureId: refundProviderCaptureId,
          providerRefundId: refundProviderRefundId,
          amount: refundAmount,
          currency: refundCurrency,
          status: refundStatus,
          rawPayload: refundRawPayload,
          createdAt: refundCreatedAt,
          updatedAt: refundUpdatedAt,
        }
      : null

  return { ...base, refund }
}

function toSearchCondition(query: string | undefined): SQL | undefined {
  if (!query) {
    return undefined
  }

  const pattern = `%${query}%`
  return or(
    ilike(paymentAttempts.id, pattern),
    ilike(paymentAttempts.internalOrderId, pattern),
    ilike(paymentAttempts.providerOrderId, pattern),
    ilike(paymentAttempts.providerCaptureId, pattern),
    ilike(flightOrders.bookingReference, pattern),
    ilike(flightOrders.contactEmail, pattern)
  )
}

function toPaymentStatusCondition(
  status: AdminPaymentListQuery["paymentStatus"],
  refundStatus: SQLWrapper
): SQL | undefined {
  switch (status) {
    case "paid":
      return inArray(paymentAttempts.status, [...paidStatuses])
    case "pending":
      return inArray(paymentAttempts.status, [...pendingStatuses])
    case "attention":
      return inArray(paymentAttempts.status, [...attentionStatuses])
    case "refunded":
      return or(
        eq(paymentAttempts.status, "refunded"),
        eq(refundStatus, "completed"),
        eq(refundStatus, "manual_completed")
      )
    case "all":
    default:
      return undefined
  }
}

function toRefundStatusCondition(
  status: AdminPaymentListQuery["refundStatus"],
  refundId: SQLWrapper,
  refundStatus: SQLWrapper
): SQL | undefined {
  switch (status) {
    case "none":
      return isNull(refundId)
    case "pending":
      return or(
        eq(refundStatus, "pending"),
        eq(refundStatus, "approved"),
        eq(refundStatus, "processing")
      )
    case "completed":
      return or(
        eq(refundStatus, "completed"),
        eq(refundStatus, "manual_completed")
      )
    case "failed":
      return eq(refundStatus, "failed")
    case "all":
    default:
      return undefined
  }
}

function toOrderBy(sort: AdminPaymentListQuery["sort"]) {
  switch (sort) {
    case "oldest":
      return [asc(paymentAttempts.createdAt)]
    case "amount_high":
      return [desc(paymentAttempts.amount), desc(paymentAttempts.createdAt)]
    case "amount_low":
      return [asc(paymentAttempts.amount), desc(paymentAttempts.createdAt)]
    case "newest":
    default:
      return [desc(paymentAttempts.createdAt)]
  }
}
