import "server-only"

import type {
  PaymentAttemptStatus,
  PaymentEventType,
} from "@/modules/payments/domain"
import type { AdminPaymentListQuery } from "@/modules/payments/domain/admin-schema"
import {
  getAdminPaymentDetailRecord,
  getAdminPaymentSummary,
  listAdminPaymentRecords,
  type AdminPaymentDetailRecord,
  type AdminPaymentRepositoryRecord,
  type AdminPaymentSummaryRecord,
} from "@/modules/payments/server/admin-repository"

type PaymentTone = "success" | "pending" | "attention" | "refunded" | "neutral"
type RefundTone = "success" | "pending" | "attention" | "neutral"

interface AdminPaymentsServiceDeps {
  listRecords: typeof listAdminPaymentRecords
  getSummary: typeof getAdminPaymentSummary
  getDetailRecord: typeof getAdminPaymentDetailRecord
}

const defaultDeps: AdminPaymentsServiceDeps = {
  listRecords: listAdminPaymentRecords,
  getSummary: getAdminPaymentSummary,
  getDetailRecord: getAdminPaymentDetailRecord,
}

export interface AdminPaymentListItem {
  id: string
  bookingReference: string | null
  customerEmail: string | null
  routeLabel: string
  provider: string
  providerOrderId: string | null
  providerCaptureId: string | null
  amount: number
  currency: string
  status: PaymentAttemptStatus
  statusLabel: string
  statusDescription: string
  statusTone: PaymentTone
  refundStatusLabel: string
  refundTone: RefundTone
  refundAmount: number | null
  refundCurrency: string | null
  cancellationRequestId: string | null
  createdAtLabel: string
  updatedAtLabel: string
}

export interface AdminPaymentListResult extends AdminPaymentListQuery {
  total: number
  pageCount: number
  items: AdminPaymentListItem[]
  summary: AdminPaymentSummaryRecord
}

export interface AdminPaymentDetailModel {
  payment: AdminPaymentListItem & {
    internalOrderId: string
    checkoutStatus: string | null
    failureCode: string | null
    failureMessage: string | null
    reconciliationRequiredAtLabel: string | null
    nextReconciliationAtLabel: string | null
    providerStatus: string | null
    canReconcile: boolean
  }
  booking: {
    flightOrderId: string
    bookingReference: string
    customerEmail: string
    routeLabel: string
  } | null
  cancellation: {
    requestId: string
    status: string
  } | null
  refunds: Array<{
    id: string
    status: string
    statusLabel: string
    tone: RefundTone
    amount: number
    currency: string
    providerRefundId: string | null
    providerCaptureId: string | null
    createdAtLabel: string
    updatedAtLabel: string
  }>
  events: Array<{
    id: string
    eventType: PaymentEventType
    label: string
    description: string
    amount: number | null
    currency: string | null
    createdAtLabel: string
  }>
  operations: {
    outbox: Array<{
      id: string
      taskLabel: string
      status: string
      attemptCount: number
      lastError: string | null
      updatedAtLabel: string
    }>
    webhooks: Array<{
      id: string
      eventType: string
      status: string
      attemptCount: number
      lastError: string | null
      receivedAtLabel: string
    }>
  }
}

export async function listAdminPayments(
  query: AdminPaymentListQuery,
  deps: AdminPaymentsServiceDeps = defaultDeps
): Promise<AdminPaymentListResult> {
  const [result, summary] = await Promise.all([
    deps.listRecords(query),
    deps.getSummary(),
  ])

  return {
    ...query,
    total: result.total,
    pageCount: Math.max(1, Math.ceil(result.total / query.pageSize)),
    items: result.records.map(toListItem),
    summary,
  }
}

export async function getAdminPaymentDetail(
  paymentAttemptId: string,
  deps: AdminPaymentsServiceDeps = defaultDeps
): Promise<AdminPaymentDetailModel | null> {
  const record = await deps.getDetailRecord(paymentAttemptId.trim())

  if (!record) {
    return null
  }

  const item = toListItem(record)

  return {
    payment: {
      ...item,
      internalOrderId: record.attempt.internalOrderId,
      checkoutStatus: record.checkoutSession?.status ?? null,
      failureCode: record.attempt.failureCode,
      failureMessage: record.attempt.failureMessage,
      reconciliationRequiredAtLabel: formatNullableDateTime(
        record.attempt.reconciliationRequiredAt
      ),
      nextReconciliationAtLabel: formatNullableDateTime(
        record.attempt.nextReconciliationAt
      ),
      providerStatus: record.attempt.providerStatus,
      canReconcile: canAdminReconcilePayment(
        record.attempt.status,
        record.attempt.providerOrderId
      ),
    },
    booking: record.order
      ? {
          flightOrderId: record.order.id,
          bookingReference: record.order.bookingReference,
          customerEmail: record.order.contactEmail,
          routeLabel: routeLabel(record.order.orderSnapshot),
        }
      : null,
    cancellation:
      record.cancellationRequestId && record.cancellationStatus
        ? {
            requestId: record.cancellationRequestId,
            status: record.cancellationStatus,
          }
        : null,
    refunds: record.refunds.map((refund) => {
      const presentation = refundPresentation(refund.status)

      return {
        id: refund.id,
        status: refund.status,
        statusLabel: presentation.label,
        tone: presentation.tone,
        amount: Number(refund.amount),
        currency: refund.currency,
        providerRefundId: refund.providerRefundId,
        providerCaptureId: refund.providerCaptureId,
        createdAtLabel: formatDateTime(refund.createdAt),
        updatedAtLabel: formatDateTime(refund.updatedAt),
      }
    }),
    events: record.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      label: paymentEventLabel(event.eventType),
      description: paymentEventDescription(event.eventType),
      amount: event.amount === null ? null : Number(event.amount),
      currency: event.currency,
      createdAtLabel: formatDateTime(event.createdAt),
    })),
    operations: {
      outbox: record.outboxTasks.map((task) => ({
        id: task.id,
        taskLabel: titleCase(task.taskType),
        status: task.status,
        attemptCount: task.attemptCount,
        lastError: task.lastError,
        updatedAtLabel: formatDateTime(task.updatedAt),
      })),
      webhooks: record.webhooks.map((webhook) => ({
        id: webhook.id,
        eventType: webhook.eventType,
        status: webhook.status,
        attemptCount: webhook.attemptCount,
        lastError: webhook.lastError,
        receivedAtLabel: formatDateTime(webhook.receivedAt),
      })),
    },
  }
}

function toListItem(
  record: AdminPaymentRepositoryRecord
): AdminPaymentListItem {
  const payment = paymentPresentation(record.attempt.status)
  const refund = record.refund
    ? refundPresentation(record.refund.status)
    : record.attempt.status === "refunded"
      ? { label: "Provider refund detected", tone: "success" as const }
      : { label: "No refund", tone: "neutral" as const }

  return {
    id: record.attempt.id,
    bookingReference: record.order?.bookingReference ?? null,
    customerEmail: record.order?.contactEmail ?? null,
    routeLabel: routeLabel(record.order?.orderSnapshot),
    provider: titleCase(record.attempt.provider),
    providerOrderId: record.attempt.providerOrderId,
    providerCaptureId: record.attempt.providerCaptureId,
    amount: Number(record.attempt.amount),
    currency: record.attempt.currency,
    status: record.attempt.status,
    statusLabel: payment.label,
    statusDescription: payment.description,
    statusTone: payment.tone,
    refundStatusLabel: refund.label,
    refundTone: refund.tone,
    refundAmount: record.refund ? Number(record.refund.amount) : null,
    refundCurrency: record.refund?.currency ?? null,
    cancellationRequestId: record.cancellationRequestId,
    createdAtLabel: formatDateTime(record.attempt.createdAt),
    updatedAtLabel: formatDateTime(record.attempt.updatedAt),
  }
}

export function paymentPresentation(status: PaymentAttemptStatus): {
  label: string
  description: string
  tone: PaymentTone
} {
  switch (status) {
    case "capture_completed":
      return {
        label: "Paid",
        description: "PayPal captured the payment.",
        tone: "success",
      }
    case "fulfillment_pending":
      return {
        label: "Paid · Fulfillment pending",
        description: "Payment is captured and booking fulfillment is pending.",
        tone: "pending",
      }
    case "fulfilled":
      return {
        label: "Paid · Fulfilled",
        description: "Payment and booking fulfillment are complete.",
        tone: "success",
      }
    case "refunded":
      return {
        label: "Refunded",
        description: "The captured payment has been refunded.",
        tone: "refunded",
      }
    case "reversed":
      return {
        label: "Reversed",
        description: "The provider reversed the captured payment.",
        tone: "attention",
      }
    case "disputed":
      return {
        label: "Disputed",
        description: "The payment has an active provider dispute.",
        tone: "attention",
      }
    case "capture_denied":
      return {
        label: "Capture denied",
        description: "PayPal denied the capture request.",
        tone: "attention",
      }
    case "capture_failed":
      return {
        label: "Capture failed",
        description: "The capture could not be completed.",
        tone: "attention",
      }
    case "reconciliation_required":
      return {
        label: "Needs reconciliation",
        description: "Local and provider payment state need to be checked.",
        tone: "attention",
      }
    case "cancelled":
      return {
        label: "Cancelled",
        description: "The payment attempt was cancelled before settlement.",
        tone: "neutral",
      }
    case "capture_pending":
      return {
        label: "Capture pending",
        description: "PayPal is still processing the capture.",
        tone: "pending",
      }
    case "buyer_approved":
      return {
        label: "Buyer approved",
        description: "The buyer approved payment; capture is not complete.",
        tone: "pending",
      }
    case "provider_order_created":
      return {
        label: "Awaiting approval",
        description: "The PayPal order is waiting for buyer approval.",
        tone: "pending",
      }
    case "created":
    default:
      return {
        label: "Started",
        description: "The payment attempt has been created.",
        tone: "pending",
      }
  }
}

export function canAdminReconcilePayment(
  status: PaymentAttemptStatus,
  providerOrderId: string | null
) {
  return Boolean(
    providerOrderId &&
    [
      "created",
      "provider_order_created",
      "buyer_approved",
      "capture_pending",
      "capture_completed",
      "reconciliation_required",
    ].includes(status)
  )
}

function refundPresentation(status: string): {
  label: string
  tone: RefundTone
} {
  switch (status) {
    case "completed":
      return { label: "Refunded", tone: "success" }
    case "manual_completed":
      return { label: "Refunded manually", tone: "success" }
    case "failed":
      return { label: "Refund failed", tone: "attention" }
    case "processing":
      return { label: "Refund processing", tone: "pending" }
    case "approved":
      return { label: "Refund approved", tone: "pending" }
    case "pending":
    default:
      return { label: "Refund pending", tone: "pending" }
  }
}

function paymentEventLabel(eventType: PaymentEventType) {
  const labels: Record<PaymentEventType, string> = {
    PAYMENT_INITIATED: "Payment initiated",
    PROVIDER_ORDER_CREATED: "PayPal order created",
    BUYER_APPROVED: "Buyer approved payment",
    CAPTURE_REQUESTED: "Capture requested",
    CAPTURE_COMPLETED: "Capture completed",
    CAPTURE_PENDING: "Capture pending",
    CAPTURE_DENIED: "Capture denied",
    WEBHOOK_RECEIVED: "Provider webhook received",
    WEBHOOK_PROCESSED: "Provider webhook processed",
    FULFILLMENT_REQUESTED: "Booking fulfillment requested",
    FULFILLMENT_COMPLETED: "Booking fulfillment completed",
    FULFILLMENT_FAILED: "Booking fulfillment failed",
    REFUND_DETECTED: "Refund detected",
    REVERSAL_DETECTED: "Payment reversal detected",
    DISPUTE_DETECTED: "Payment dispute detected",
    RECONCILIATION_CHECKED: "Provider status checked",
    RECONCILIATION_REPAIRED: "Payment state repaired",
    RECONCILIATION_REQUIRED: "Reconciliation required",
  }

  return labels[eventType]
}

function paymentEventDescription(eventType: PaymentEventType) {
  switch (eventType) {
    case "RECONCILIATION_REPAIRED":
      return "Local payment state was safely updated from PayPal."
    case "RECONCILIATION_REQUIRED":
      return "Automatic reconciliation could not safely resolve the provider state."
    case "FULFILLMENT_FAILED":
      return "Payment succeeded, but the booking fulfillment task failed."
    case "REFUND_DETECTED":
      return "PayPal reported a refund against this capture."
    case "REVERSAL_DETECTED":
      return "PayPal reported a reversal against this capture."
    case "DISPUTE_DETECTED":
      return "PayPal reported a dispute against this payment."
    default:
      return "Recorded in the payment provider lifecycle."
  }
}

function routeLabel(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return "Flight order"
  }

  const value = (snapshot as Record<string, unknown>).routeLabel
  return typeof value === "string" && value.trim() ? value : "Flight order"
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function formatNullableDateTime(value: Date | null) {
  return value ? formatDateTime(value) : null
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

export type { AdminPaymentsServiceDeps, AdminPaymentDetailRecord }
