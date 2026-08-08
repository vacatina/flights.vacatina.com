import "server-only"

import { format } from "date-fns"

import type { ActorContext } from "@/modules/auth/types"
import { GUEST_UNAVAILABLE_ID } from "@/modules/auth/constants"
import { canGuestAccessBooking } from "@/modules/flights/orders/server/guest-access"
import { normalizeSnapshot } from "@/modules/flights/orders/domain/snapshot"
import {
  calculateCancellationFee,
  canTransitionCancellationStatus,
  capCustomerRefundAmount,
  getRejectedCancellationCooldownEndsAt,
  isRejectedCancellationCooldownActive,
  parseAdminFlightCancellationUpdate,
  parseCreateFlightCancellationRequestInput,
  type FlightCancellationFeeType,
  type FlightCancellationStatus,
} from "@/modules/flights/cancellations/domain"
import {
  defaultFlightOrderRepository,
  type FlightOrderRecord,
  type FlightOrderRepository,
} from "@/modules/flights/checkout/server/order-repository"
import {
  defaultCheckoutSessionRepository,
  type CheckoutSessionRepository,
} from "@/modules/flights/checkout/server/session-repository"
import {
  defaultCancellationRepository,
  type CancellationDetailRecord,
  type CancellationRepository,
  type CancellationRequestRecord,
} from "@/modules/flights/cancellations/server/repository"
import {
  calculateDefaultCancellationFee,
  getCancellationServerConfig,
  type CancellationServerConfig,
} from "@/modules/flights/cancellations/server/config"
import type { AdminActor } from "@/modules/flights/cancellations/server/admin-guard"
import {
  defaultDuffelCancellationService,
  hasDuffelCancelAction,
  type DuffelCancellationService,
} from "@/modules/flights/cancellations/server/duffel"
import {
  listActiveAdminAlertRecipients,
  type AdminAlertRecipient,
} from "@/modules/flights/cancellations/server/admin-notifications"
import { refundPayPalCapture } from "@/modules/payments/server/providers/paypal"
import { reconcilePaymentAttemptById } from "@/modules/payments/server/reconciliation-service"
import { enqueueNotification } from "@/modules/notifications/server"
import { createEmailHash } from "@/modules/flights/orders/server/identity"
import type { NotificationEventType } from "@/modules/notifications/domain"

export interface CancellationStatusSummary {
  id: string
  status: FlightCancellationStatus
  statusLabel: string
  customerMessage: string | null
  customerRefundAmount: number | null
  customerRefundCurrency: string | null
  adminFeeAmount: number
  adminRejectionReason: string | null
  rejectedAt: Date | null
  createdAtLabel: string
  updatedAtLabel: string
}

export interface CancellationEligibilityContext {
  booking: FlightOrderRecord
  snapshot: ReturnType<typeof normalizeSnapshot>
  businessSettings: Awaited<
    ReturnType<CancellationRepository["getBusinessSettings"]>
  >
  existingRequest: CancellationStatusSummary | null
  canSubmit: boolean
  blockedReason: string | null
  cooldownEndsAt: Date | null
  duffelApiAvailable: boolean
  manualSupportCase: boolean
  estimatedFeeAmount: number
  estimatedRefundAmount: number
  currency: string
}

export interface AdminCancellationQueueItem {
  id: string
  bookingReference: string
  customerEmail: string
  routeLabel: string
  airlineName: string
  departureLabel: string
  status: FlightCancellationStatus
  statusLabel: string
  duffelApiAvailable: boolean | null
  refundLabel: string
  serviceFeeLabel: string
  latestActionState: string
  updatedAtLabel: string
}

export interface AdminCancellationDetailModel {
  request: CancellationStatusSummary & {
    customerReason: string
    duffelApiAvailable: boolean | null
    adminFeeType: FlightCancellationFeeType
    adminFeeValue: number
    cutoffOverrideReason: string | null
    cancellationApprovedAtLabel: string | null
    refundApprovedAtLabel: string | null
  }
  booking: {
    reference: string
    customerEmail: string
    routeLabel: string
    airlineName: string
    departureLabel: string
    duffelOrderId: string
    fareConditions: string[]
    sellAmount: number
    currency: string
    sellAmountLabel: string
  }
  payment: {
    capturedAmount: number
    currency: string
    providerCaptureId: string | null
  }
  quotes: Array<{
    id: string
    duffelOrderCancellationId: string
    refundLabel: string
    refundTo: string
    expiresAtLabel: string
    confirmedAtLabel: string | null
  }>
  passengers: Array<{ id: string; label: string; fullName: string | null }>
  events: Array<{
    id: string
    eventType: string
    actorType: string
    message: string | null
    createdAtLabel: string
  }>
  refunds: Array<{
    id: string
    amountLabel: string
    status: string
    createdAtLabel: string
  }>
}

export interface CancellationServiceDeps {
  cancellationRepository: CancellationRepository
  orderRepository: FlightOrderRepository
  checkoutSessionRepository: CheckoutSessionRepository
  config: CancellationServerConfig
  now: () => Date
  duffelService: DuffelCancellationService
  refundProvider: (input: {
    captureId: string
    amount: number
    currency: string
    idempotencyKey: string
    noteToPayer?: string | null
  }) => Promise<{ id: string; status?: string; amount?: unknown }>
  refreshPaymentCapture: (input: {
    paymentAttemptId: string
  }) => Promise<unknown>
  enqueueNotification: typeof enqueueNotification
  listAdminAlertRecipients: () => Promise<AdminAlertRecipient[]>
}

const defaultDeps: CancellationServiceDeps = {
  cancellationRepository: defaultCancellationRepository,
  orderRepository: defaultFlightOrderRepository,
  checkoutSessionRepository: defaultCheckoutSessionRepository,
  config: getCancellationServerConfig(),
  now: () => new Date(),
  duffelService: defaultDuffelCancellationService,
  refundProvider: refundPayPalCapture,
  refreshPaymentCapture: ({ paymentAttemptId }) =>
    reconcilePaymentAttemptById({ paymentAttemptId }),
  enqueueNotification,
  listAdminAlertRecipients: listActiveAdminAlertRecipients,
}

export async function getCancellationEligibilityContext(
  input: {
    bookingReference: string
    actor: ActorContext
  },
  deps: CancellationServiceDeps = defaultDeps
): Promise<CancellationEligibilityContext> {
  const booking = await requireAccessibleBooking(
    {
      bookingReference: input.bookingReference,
      actor: input.actor,
    },
    deps
  )
  const snapshot = normalizeSnapshot(booking.orderSnapshot)
  const [existing, rejected, businessSettings] = await Promise.all([
    deps.cancellationRepository.findLatestRequestByFlightOrderId(booking.id),
    deps.cancellationRepository.findLatestRejectedRequestByFlightOrderId(
      booking.id
    ),
    deps.cancellationRepository.getBusinessSettings(),
  ])
  const activeRequest =
    existing &&
    existing.status !== "completed" &&
    existing.status !== "rejected" &&
    existing.status !== "failed"
      ? existing
      : null
  const cooldownActive = isRejectedCancellationCooldownActive({
    rejectedAt: rejected?.rejectedAt,
    now: deps.now(),
    cooldownMinutes: deps.config.rejectionCooldownMinutes,
  })
  const cooldownEndsAt =
    rejected?.rejectedAt && cooldownActive
      ? getRejectedCancellationCooldownEndsAt({
          rejectedAt: rejected.rejectedAt,
          cooldownMinutes: deps.config.rejectionCooldownMinutes,
        })
      : null
  const duffelApiAvailable = snapshot.availableActions.includes("cancel")
  const manualSupportCase =
    isDeparted(snapshot, deps.now()) || !duffelApiAvailable
  const estimatedFeeAmount = calculateDefaultCancellationFee({
    baseAmount: booking.sellAmount,
    currency: booking.currency,
    config: deps.config,
  })
  const estimatedRefundAmount = capCustomerRefundAmount({
    airlineRefundAmount: booking.sellAmount,
    feeAmount: estimatedFeeAmount,
    capturedPaymentAmount: resolveCapturedPaymentAmount(booking, null),
    currency: booking.currency,
  })

  return {
    booking,
    snapshot,
    businessSettings,
    existingRequest: existing ? toCancellationStatusSummary(existing) : null,
    canSubmit: !activeRequest && !cooldownActive,
    blockedReason: activeRequest
      ? "A cancellation request is already open for this booking."
      : cooldownActive
        ? "Please wait before submitting another cancellation request."
        : null,
    cooldownEndsAt,
    duffelApiAvailable,
    manualSupportCase,
    estimatedFeeAmount,
    estimatedRefundAmount,
    currency: booking.currency,
  }
}

export async function createCancellationRequest(
  input: {
    bookingReference: string
    customerReason: string
    actor: ActorContext
  },
  deps: CancellationServiceDeps = defaultDeps
) {
  const context = await getCancellationEligibilityContext(
    {
      bookingReference: input.bookingReference,
      actor: input.actor,
    },
    deps
  )

  if (!context.canSubmit) {
    throw new Error(
      context.blockedReason ?? "Cancellation request is not available."
    )
  }

  const requester = toRequester(input.actor)
  const parsed = parseCreateFlightCancellationRequestInput({
    flightOrderId: context.booking.id,
    bookingReference: context.booking.bookingReference,
    duffelOrderId: context.booking.duffelOrderId,
    requestedByUserId: requester.userId,
    requestedByGuestId: requester.guestId,
    customerReason: input.customerReason,
    duffelApiAvailable: context.duffelApiAvailable,
  })
  const status: FlightCancellationStatus = context.manualSupportCase
    ? "manual_processing"
    : "requested"
  const request = await deps.cancellationRepository.createRequest({
    ...parsed,
    requestedByUserId: parsed.requestedByUserId ?? null,
    requestedByGuestId: parsed.requestedByGuestId ?? null,
    duffelApiAvailable: parsed.duffelApiAvailable ?? null,
    adminFeeType: deps.config.defaultFeeType,
    adminFeeValue: deps.config.defaultFeeValue,
    adminFeeAmount: context.estimatedFeeAmount,
    customerRefundAmount: context.estimatedRefundAmount,
    customerRefundCurrency: context.currency,
    customerMessage: context.manualSupportCase
      ? "Your request is with support for manual review."
      : "Your request is awaiting admin review.",
    status,
  })

  await deps.cancellationRepository.addEvent({
    cancellationRequestId: request.id,
    actorType: input.actor.type === "user" ? "customer" : "guest",
    actorId: requester.userId ?? requester.guestId,
    eventType: "request_created",
    message: context.manualSupportCase
      ? "Customer submitted a full-booking cancellation request for manual support."
      : "Customer submitted a full-booking cancellation request.",
    metadata: {
      scope: "full_booking",
      duffelApiAvailable: context.duffelApiAvailable,
    },
  })
  await enqueueCancellationNotifications(
    {
      requestId: request.id,
      eventType:
        status === "manual_processing"
          ? "cancellation_manual_review"
          : "cancellation_request_received",
      adminAlert: true,
    },
    deps
  )

  return toCancellationStatusSummary(request)
}

export async function createAdminCancellationRequest(
  input: {
    bookingReference: string
    reason: string
    admin: AdminActor
  },
  deps: CancellationServiceDeps = defaultDeps
) {
  const booking = await deps.orderRepository.findByBookingReference(
    input.bookingReference.trim().toUpperCase()
  )

  if (!booking) {
    throw new Error("Booking not found.")
  }

  const existing =
    await deps.cancellationRepository.findLatestRequestByFlightOrderId(
      booking.id
    )

  if (existing?.status === "completed") {
    throw new Error("This booking has already been cancelled.")
  }

  if (
    existing &&
    existing.status !== "rejected" &&
    existing.status !== "failed"
  ) {
    throw new Error("A cancellation case is already open for this booking.")
  }

  const snapshot = normalizeSnapshot(booking.orderSnapshot)
  const duffelApiAvailable = snapshot.availableActions.includes("cancel")
  const manualSupportCase =
    isDeparted(snapshot, deps.now()) || !duffelApiAvailable
  const estimatedFeeAmount = calculateDefaultCancellationFee({
    baseAmount: booking.sellAmount,
    currency: booking.currency,
    config: deps.config,
  })
  const estimatedRefundAmount = capCustomerRefundAmount({
    airlineRefundAmount: booking.sellAmount,
    feeAmount: estimatedFeeAmount,
    capturedPaymentAmount: resolveCapturedPaymentAmount(booking, null),
    currency: booking.currency,
  })
  const parsed = parseCreateFlightCancellationRequestInput({
    flightOrderId: booking.id,
    bookingReference: booking.bookingReference,
    duffelOrderId: booking.duffelOrderId,
    requestedByUserId: input.admin.appUserId,
    requestedByGuestId: null,
    customerReason: input.reason,
    duffelApiAvailable,
  })
  const status: FlightCancellationStatus = manualSupportCase
    ? "manual_processing"
    : "requested"
  const request = await deps.cancellationRepository.createRequest({
    ...parsed,
    requestedByUserId: input.admin.appUserId,
    requestedByGuestId: null,
    duffelApiAvailable,
    adminFeeType: deps.config.defaultFeeType,
    adminFeeValue: deps.config.defaultFeeValue,
    adminFeeAmount: estimatedFeeAmount,
    customerRefundAmount: estimatedRefundAmount,
    customerRefundCurrency: booking.currency,
    customerMessage: manualSupportCase
      ? "An administrator started your cancellation. It is with support for manual review."
      : "An administrator started your cancellation. It is awaiting review.",
    status,
  })

  await deps.cancellationRepository.addEvent({
    cancellationRequestId: request.id,
    actorType: "admin",
    actorId: input.admin.appUserId,
    eventType: "request_created",
    message: "Admin started a full-booking cancellation case.",
    metadata: {
      scope: "full_booking",
      initiatedBy: "admin",
      duffelApiAvailable,
    },
  })
  await enqueueCancellationNotifications(
    {
      requestId: request.id,
      eventType: manualSupportCase
        ? "cancellation_manual_review"
        : "cancellation_request_received",
      adminAlert: true,
    },
    deps
  )

  return toCancellationStatusSummary(request)
}

export async function getCancellationStatusForBooking(
  input: { bookingReference: string; actor: ActorContext },
  deps: CancellationServiceDeps = defaultDeps
) {
  const context = await getCancellationEligibilityContext(input, deps)
  return context.existingRequest
}

export async function listAdminCancellationRequests(
  deps: CancellationServiceDeps = defaultDeps
) {
  const rows = await deps.cancellationRepository.listRequests({
    limit: 100,
    offset: 0,
  })

  return rows.map((row): AdminCancellationQueueItem => {
    const snapshot = normalizeSnapshot(row.order.orderSnapshot)
    const firstLeg = snapshot.legs[0] ?? null

    return {
      id: row.request.id,
      bookingReference: row.request.bookingReference,
      customerEmail: row.order.contactEmail,
      routeLabel: snapshot.routeLabel,
      airlineName: firstLeg?.ownerName ?? "Airline unavailable",
      departureLabel: firstLeg?.departureLabel ?? "Departure unavailable",
      status: row.request.status,
      statusLabel: toStatusLabel(row.request.status),
      duffelApiAvailable: row.request.duffelApiAvailable,
      refundLabel: formatNullableMoney(
        row.request.customerRefundAmount,
        row.request.customerRefundCurrency ?? row.order.currency
      ),
      serviceFeeLabel: formatMoney(
        row.request.adminFeeAmount,
        row.order.currency
      ),
      latestActionState:
        row.request.customerMessage ?? toStatusLabel(row.request.status),
      updatedAtLabel: formatDateTime(row.request.updatedAt),
    }
  })
}

export async function getAdminCancellationDetail(
  requestId: string,
  deps: CancellationServiceDeps = defaultDeps
): Promise<AdminCancellationDetailModel> {
  const detail = await deps.cancellationRepository.getDetail(requestId)

  if (!detail) {
    throw new Error("Cancellation request not found.")
  }

  return mapAdminDetail(detail)
}

export async function createOrRefreshDuffelCancellationQuote(
  input: { requestId: string; admin: AdminActor },
  deps: CancellationServiceDeps = defaultDeps
) {
  const detail = await requireCancellationDetail(input.requestId, deps)
  const order = await deps.duffelService.getOrder(detail.request.duffelOrderId)
  const duffelApiAvailable = hasDuffelCancelAction(order)

  await deps.cancellationRepository.updateRequest(input.requestId, {
    duffelApiAvailable,
  })

  if (!duffelApiAvailable) {
    const updated = await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "manual_processing",
        patch: {
          duffelApiAvailable: false,
          customerMessage:
            "This booking requires manual cancellation support because airline API cancellation is unavailable.",
        },
        eventType: "manual_processing_started",
        eventMessage: "Duffel order does not expose API cancellation.",
        actorType: "admin",
        actorId: input.admin.appUserId,
        notificationType: "cancellation_manual_review",
        adminAlert: true,
      },
      deps
    )
    return requireUpdated(updated)
  }

  try {
    await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "quote_pending",
        patch: { duffelApiAvailable: true },
        eventType: "duffel_quote_requested",
        eventMessage: "Admin requested a Duffel cancellation quote.",
        actorType: "admin",
        actorId: input.admin.appUserId,
        notificationType: "cancellation_manual_review",
      },
      deps
    )
    const quote = await deps.duffelService.createCancellationQuote(
      detail.request.duffelOrderId
    )
    await deps.cancellationRepository.createQuote({
      cancellationRequestId: input.requestId,
      duffelOrderCancellationId: quote.id,
      refundAmount: quote.refundAmount,
      refundCurrency: quote.refundCurrency,
      refundTo: quote.refundTo,
      expiresAt: quote.expiresAt,
      confirmedAt: quote.confirmedAt,
      rawPayload: quote.rawPayload,
    })
    const currency = quote.refundCurrency ?? detail.order.currency
    const feeAmount = calculateCancellationFee({
      feeType: detail.request.adminFeeType,
      feeValue: detail.request.adminFeeValue,
      baseAmount: quote.refundAmount ?? 0,
      currency,
    })
    const customerRefundAmount = capCustomerRefundAmount({
      airlineRefundAmount: quote.refundAmount ?? 0,
      feeAmount,
      capturedPaymentAmount: resolveCapturedPaymentAmount(
        toFlightOrderRecord(detail.order),
        detail.paymentAttempt
      ),
      currency,
    })
    const updated = await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "quote_ready",
        patch: {
          adminFeeAmount: feeAmount,
          customerRefundAmount,
          customerRefundCurrency: currency,
          customerMessage:
            detail.request.customerMessage ??
            "Your airline cancellation quote is ready for admin review.",
        },
        eventType: "duffel_quote_created",
        eventMessage: "Duffel cancellation quote created.",
        actorType: "admin",
        actorId: input.admin.appUserId,
        notificationType: "cancellation_quote_ready",
        adminAlert: true,
      },
      deps
    )
    return requireUpdated(updated)
  } catch (error) {
    await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "admin_review_required",
        patch: {
          customerMessage:
            "Your cancellation request needs manual admin review before we can confirm next steps.",
        },
        eventType: "duffel_quote_failed",
        eventMessage:
          error instanceof Error ? error.message : "Duffel quote failed.",
        actorType: "system",
        actorId: null,
        notificationType: "cancellation_issue",
        adminAlert: true,
        metadata: { phase: "duffel_quote" },
      },
      deps
    )
    throw error
  }
}

export async function approveCancellation(
  input: { requestId: string; admin: AdminActor },
  deps: CancellationServiceDeps = defaultDeps
) {
  const detail = await requireCancellationDetail(input.requestId, deps)
  const approvedAt = deps.now()

  if (detail.request.duffelApiAvailable === false) {
    const updated = await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "manual_processing",
        patch: {
          cancellationApprovedBy: input.admin.appUserId,
          cancellationApprovedAt: approvedAt,
          customerMessage:
            detail.request.customerMessage ??
            "Your cancellation has been approved and is being handled manually by support.",
        },
        eventType: "cancellation_approved_manual",
        eventMessage: "Admin approved cancellation for manual processing.",
        actorType: "admin",
        actorId: input.admin.appUserId,
        notificationType: "cancellation_approved",
        adminAlert: true,
      },
      deps
    )
    return requireUpdated(updated)
  }

  const currentDetail =
    detail.quotes.length > 0
      ? detail
      : await createOrRefreshDuffelCancellationQuote(input, deps).then(() =>
          requireCancellationDetail(input.requestId, deps)
        )
  if (currentDetail.request.duffelApiAvailable === false) {
    return toCancellationStatusSummary(currentDetail.request)
  }
  const latestQuote = currentDetail.quotes[0]

  if (!latestQuote) {
    throw new Error("A Duffel cancellation quote is required before approval.")
  }

  await transitionRequestStatus(
    {
      requestId: input.requestId,
      status: "duffel_confirming",
      patch: {
        cancellationApprovedBy: input.admin.appUserId,
        cancellationApprovedAt: approvedAt,
        customerMessage:
          detail.request.customerMessage ??
          "Your cancellation has been approved and is being confirmed with the airline.",
      },
      eventType: "duffel_cancellation_confirming",
      eventMessage:
        "Admin approved cancellation; confirming latest Duffel quote.",
      actorType: "admin",
      actorId: input.admin.appUserId,
      notificationType: "cancellation_approved",
      adminAlert: true,
    },
    deps
  )

  try {
    const confirmed = await deps.duffelService.confirmCancellationQuote(
      latestQuote.duffelOrderCancellationId
    )
    await deps.cancellationRepository.markQuoteConfirmed({
      quoteId: latestQuote.id,
      confirmedAt: confirmed.confirmedAt ?? deps.now(),
      rawPayload: confirmed.rawPayload,
    })
    await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "duffel_cancelled",
        patch: {
          customerMessage:
            "Your flight cancellation has been confirmed with the airline. Refund review is next.",
        },
        eventType: "duffel_cancellation_confirmed",
        eventMessage: "Duffel cancellation quote confirmed.",
        actorType: "system",
        actorId: null,
        notificationType: "cancellation_completed",
        adminAlert: true,
      },
      deps
    )
    const updated = await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "refund_pending",
        patch: {
          customerMessage:
            "Your flight cancellation is complete and your refund is awaiting review.",
        },
        eventType: "refund_review_pending",
        eventMessage: "Cancellation is ready for refund review.",
        actorType: "system",
        actorId: null,
        notificationType: "cancellation_approved",
      },
      deps
    )
    return requireUpdated(updated)
  } catch (error) {
    const updated = await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "manual_processing",
        patch: {
          customerMessage:
            "Your cancellation was approved, but airline confirmation needs manual support.",
        },
        eventType: "duffel_confirm_failed",
        eventMessage:
          error instanceof Error
            ? error.message
            : "Duffel confirmation failed.",
        actorType: "system",
        actorId: null,
        notificationType: "cancellation_issue",
        adminAlert: true,
        metadata: { phase: "duffel_confirm" },
      },
      deps
    )
    return requireUpdated(updated)
  }
}

export async function rejectCancellation(
  input: { requestId: string; admin: AdminActor; reason: string },
  deps: CancellationServiceDeps = defaultDeps
) {
  const reason = input.reason.trim()
  if (!reason) {
    throw new Error("A rejection reason is required.")
  }

  const detail = await requireCancellationDetail(input.requestId, deps)
  assertTransition(detail.request.status, "rejected")
  const updated = await transitionRequestStatus(
    {
      requestId: input.requestId,
      status: "rejected",
      patch: {
        adminRejectionReason: reason,
        rejectedAt: deps.now(),
        customerMessage: reason,
      },
      eventType: "cancellation_rejected",
      eventMessage: reason,
      actorType: "admin",
      actorId: input.admin.appUserId,
      notificationType: "cancellation_rejected",
      adminAlert: true,
    },
    deps
  )
  return requireUpdated(updated)
}

export async function moveCancellationToManualProcessing(
  input: { requestId: string; admin: AdminActor; message?: string | null },
  deps: CancellationServiceDeps = defaultDeps
) {
  const detail = await requireCancellationDetail(input.requestId, deps)
  assertTransition(detail.request.status, "manual_processing")
  const updated = await transitionRequestStatus(
    {
      requestId: input.requestId,
      status: "manual_processing",
      patch: {
        customerMessage:
          input.message?.trim() ||
          "Your cancellation request is being handled manually by support.",
      },
      eventType: "manual_processing_started",
      eventMessage: "Admin moved request to manual processing.",
      actorType: "admin",
      actorId: input.admin.appUserId,
      notificationType: "cancellation_manual_review",
      adminAlert: true,
    },
    deps
  )
  return requireUpdated(updated)
}

export async function approveRefund(
  input: { requestId: string; admin: AdminActor },
  deps: CancellationServiceDeps = defaultDeps
) {
  let detail = await requireCancellationDetail(input.requestId, deps)
  assertTransition(detail.request.status, "refund_pending")
  const existingRefundAttempt = detail.refunds.find(
    (refund) =>
      refund.provider === "paypal" &&
      ["approved", "processing", "completed", "manual_completed"].includes(
        refund.status
      )
  )

  if (existingRefundAttempt) {
    return requireUpdated(detail.request)
  }

  if (!detail.paymentAttempt?.providerCaptureId && detail.paymentAttempt?.id) {
    try {
      await deps.refreshPaymentCapture({
        paymentAttemptId: detail.paymentAttempt.id,
      })
      detail = await requireCancellationDetail(input.requestId, deps)
    } catch {
      // The normal PayPal failure/manual path below records the actionable state.
    }
  }

  const amount = detail.request.customerRefundAmount ?? 0
  const currency =
    detail.request.customerRefundCurrency ?? detail.order.currency
  const captureId = detail.paymentAttempt?.providerCaptureId
  const cappedAmount = capCustomerRefundAmount({
    airlineRefundAmount: amount,
    feeAmount: 0,
    capturedPaymentAmount: resolveCapturedPaymentAmount(
      toFlightOrderRecord(detail.order),
      detail.paymentAttempt
    ),
    currency,
  })
  const initialStatus = captureId ? "processing" : "approved"
  const refundAttempt = await deps.cancellationRepository.createRefundAttempt({
    cancellationRequestId: input.requestId,
    paymentAttemptId: detail.order.paymentAttemptId,
    provider: "paypal",
    providerCaptureId: captureId ?? null,
    amount: cappedAmount,
    currency,
    status: initialStatus,
    rawPayload: {
      idempotencyKey: createRefundIdempotencyKey(input.requestId),
      cappedAtCapturedPaymentAmount: true,
      airlineRefundAmount: amount,
      cancellationFeeAmount: detail.request.adminFeeAmount,
      customerRefundAmount: cappedAmount,
      capturedPaymentAmount: resolveCapturedPaymentAmount(
        toFlightOrderRecord(detail.order),
        detail.paymentAttempt
      ),
    },
  })
  await deps.cancellationRepository.updateRequest(input.requestId, {
    status: captureId ? "refund_pending" : "manual_processing",
    customerRefundAmount: cappedAmount,
    customerRefundCurrency: currency,
    refundApprovedBy: input.admin.appUserId,
    refundApprovedAt: deps.now(),
    customerMessage:
      detail.request.customerMessage ??
      (captureId
        ? "Your refund has been approved and is being sent to your original payment method."
        : "Your refund has been approved and is awaiting manual completion."),
  })
  await addAdminEvent(deps, input, "refund_approved", "Admin approved refund.")

  if (!captureId) {
    const updated = await requireCancellationDetail(input.requestId, deps)
    await enqueueCancellationNotifications(
      {
        requestId: input.requestId,
        eventType: "cancellation_issue",
        adminAlert: true,
      },
      deps
    )
    return toCancellationStatusSummary(updated.request)
  }

  try {
    const providerRefund = await deps.refundProvider({
      captureId,
      amount: cappedAmount,
      currency,
      idempotencyKey: createRefundIdempotencyKey(input.requestId),
      noteToPayer: `Refund for flight cancellation ${detail.order.bookingReference}`,
    })
    await deps.cancellationRepository.updateRefundAttempt({
      refundAttemptId: refundAttempt.id,
      providerRefundId: providerRefund.id,
      status: toRefundAttemptStatus(providerRefund.status),
      rawPayload: providerRefund,
    })
    const updated = await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "completed",
        patch: {
          customerMessage: "Your cancellation and refund have been completed.",
        },
        eventType: "paypal_refund_completed",
        eventMessage: "PayPal refund completed.",
        actorType: "system",
        actorId: null,
        notificationType: "cancellation_refund_completed",
        adminAlert: true,
      },
      deps
    )
    return requireUpdated(updated)
  } catch (error) {
    await deps.cancellationRepository.updateRefundAttempt({
      refundAttemptId: refundAttempt.id,
      status: "failed",
      rawPayload: {
        error: error instanceof Error ? error.message : "PayPal refund failed.",
      },
    })
    const updated = await transitionRequestStatus(
      {
        requestId: input.requestId,
        status: "manual_processing",
        patch: {
          customerMessage:
            "Your refund needs manual support because the payment provider refund could not be completed automatically.",
        },
        eventType: "paypal_refund_failed",
        eventMessage:
          error instanceof Error ? error.message : "PayPal refund failed.",
        actorType: "system",
        actorId: null,
        notificationType: "cancellation_issue",
        adminAlert: true,
      },
      deps
    )
    return requireUpdated(updated)
  }
}

export async function markManualRefundCompleted(
  input: { requestId: string; admin: AdminActor },
  deps: CancellationServiceDeps = defaultDeps
) {
  const detail = await requireCancellationDetail(input.requestId, deps)
  assertTransition(detail.request.status, "completed")
  const amount = detail.request.customerRefundAmount ?? 0
  const currency =
    detail.request.customerRefundCurrency ?? detail.order.currency
  const updated = await transitionRequestStatus(
    {
      requestId: input.requestId,
      status: "completed",
      patch: {
        customerMessage:
          detail.request.customerMessage ??
          "Your cancellation and refund have been completed.",
      },
      eventType: "manual_refund_completed",
      eventMessage: "Admin marked refund completed manually.",
      actorType: "admin",
      actorId: input.admin.appUserId,
      notificationType: "cancellation_refund_completed",
      adminAlert: true,
    },
    deps
  )
  await deps.cancellationRepository.createRefundAttempt({
    cancellationRequestId: input.requestId,
    paymentAttemptId: detail.order.paymentAttemptId,
    provider: "paypal",
    providerCaptureId: detail.paymentAttempt?.providerCaptureId ?? null,
    amount,
    currency,
    status: "manual_completed",
    rawPayload: {
      internalOnly: true,
      reason: "Refund marked completed manually.",
    },
  })
  return requireUpdated(updated)
}

export async function updateCancellationFeeAndRefund(
  input: {
    requestId: string
    admin: AdminActor
    feeType: FlightCancellationFeeType
    feeValue: number
    airlineRefundAmount: number
    customerRefundCurrency: string
  },
  deps: CancellationServiceDeps = defaultDeps
) {
  const parsed = parseAdminFlightCancellationUpdate({
    adminFeeType: input.feeType,
    adminFeeValue: input.feeValue,
    customerRefundCurrency: input.customerRefundCurrency,
  })
  const detail = await requireCancellationDetail(input.requestId, deps)
  const currency = parsed.customerRefundCurrency ?? detail.order.currency
  const feeAmount = calculateCancellationFee({
    feeType: parsed.adminFeeType,
    feeValue: parsed.adminFeeValue,
    baseAmount: input.airlineRefundAmount,
    currency,
  })
  const customerRefundAmount = capCustomerRefundAmount({
    airlineRefundAmount: input.airlineRefundAmount,
    feeAmount,
    capturedPaymentAmount: resolveCapturedPaymentAmount(
      toFlightOrderRecord(detail.order),
      detail.paymentAttempt
    ),
    currency,
  })
  const updated = await deps.cancellationRepository.updateRequest(
    input.requestId,
    {
      adminFeeType: parsed.adminFeeType,
      adminFeeValue: parsed.adminFeeValue,
      adminFeeAmount: feeAmount,
      customerRefundAmount,
      customerRefundCurrency: currency,
    }
  )
  await addAdminEvent(
    deps,
    input,
    "fee_refund_updated",
    "Admin updated fee and refund."
  )
  return requireUpdated(updated)
}

export async function updateCustomerMessage(
  input: { requestId: string; admin: AdminActor; message: string },
  deps: CancellationServiceDeps = defaultDeps
) {
  const message = input.message.trim()
  const updated = await deps.cancellationRepository.updateRequest(
    input.requestId,
    {
      customerMessage: message || null,
      customerMessageUpdatedBy: input.admin.appUserId,
      customerMessageUpdatedAt: deps.now(),
    }
  )
  await addAdminEvent(
    deps,
    input,
    "customer_message_updated",
    "Admin updated customer message."
  )
  return requireUpdated(updated)
}

export async function recordCutoffTimingOverride(
  input: { requestId: string; admin: AdminActor; reason: string },
  deps: CancellationServiceDeps = defaultDeps
) {
  const reason = input.reason.trim()
  if (!reason) {
    throw new Error("A timing override reason is required.")
  }

  const updated = await deps.cancellationRepository.updateRequest(
    input.requestId,
    {
      cutoffOverrideBy: input.admin.appUserId,
      cutoffOverrideAt: deps.now(),
      cutoffOverrideReason: reason,
    }
  )
  await addAdminEvent(deps, input, "cutoff_override_recorded", reason)
  return requireUpdated(updated)
}

export async function getCurrentBusinessSettings(
  deps: CancellationServiceDeps = defaultDeps
) {
  return deps.cancellationRepository.getBusinessSettings()
}

export async function updateBusinessSettings(
  input: {
    admin: AdminActor
    businessName: string
    supportEmail: string
    supportPhone: string
    supportWhatsapp: string
    address: string
    timezone: string
  },
  deps: CancellationServiceDeps = defaultDeps
) {
  return deps.cancellationRepository.updateBusinessSettings({
    businessName: input.businessName.trim(),
    supportEmail: input.supportEmail.trim(),
    supportPhone: input.supportPhone.trim(),
    supportWhatsapp: input.supportWhatsapp.trim(),
    address: input.address.trim(),
    timezone: input.timezone.trim(),
    updatedBy: input.admin.appUserId,
  })
}

async function requireAccessibleBooking(
  input: { bookingReference: string; actor: ActorContext },
  deps: CancellationServiceDeps
) {
  const booking = await deps.orderRepository.findByBookingReference(
    input.bookingReference
  )

  if (!booking) {
    throw new Error("Booking not found.")
  }

  const ownerAllowed =
    input.actor.type === "user"
      ? booking.ownerUserId === input.actor.appUserId
      : input.actor.guestId !== GUEST_UNAVAILABLE_ID &&
        booking.ownerGuestId === input.actor.guestId
  if (ownerAllowed) {
    return booking
  }

  const guestLookupAllowed = await canGuestAccessBooking({
    bookingReference: booking.bookingReference,
    contactEmailHash: booking.contactEmailHash,
  })

  if (!guestLookupAllowed) {
    throw new Error("Booking access denied.")
  }

  return booking
}

function toRequester(actor: ActorContext) {
  if (actor.type === "user") {
    return {
      userId: actor.appUserId,
      guestId: null,
    }
  }

  return {
    userId: null,
    guestId: actor.guestId === GUEST_UNAVAILABLE_ID ? null : actor.guestId,
  }
}

function toCancellationStatusSummary(
  request: CancellationRequestRecord
): CancellationStatusSummary {
  return {
    id: request.id,
    status: request.status,
    statusLabel: toStatusLabel(request.status),
    customerMessage: request.customerMessage,
    customerRefundAmount: request.customerRefundAmount,
    customerRefundCurrency: request.customerRefundCurrency,
    adminFeeAmount: request.adminFeeAmount,
    adminRejectionReason: request.adminRejectionReason,
    rejectedAt: request.rejectedAt,
    createdAtLabel: formatDateTime(request.createdAt),
    updatedAtLabel: formatDateTime(request.updatedAt),
  }
}

function mapAdminDetail(
  detail: CancellationDetailRecord
): AdminCancellationDetailModel {
  const snapshot = normalizeSnapshot(detail.order.orderSnapshot)
  const firstLeg = snapshot.legs[0] ?? null
  const paymentAmount = detail.paymentAttempt
    ? Number(detail.paymentAttempt.amount)
    : Number(detail.order.sellAmount)
  const paymentCurrency =
    detail.paymentAttempt?.currency ?? detail.order.currency

  return {
    request: {
      ...toCancellationStatusSummary(detail.request),
      customerReason: detail.request.customerReason,
      duffelApiAvailable: detail.request.duffelApiAvailable,
      adminFeeType: detail.request.adminFeeType,
      adminFeeValue: detail.request.adminFeeValue,
      cutoffOverrideReason: detail.request.cutoffOverrideReason,
      cancellationApprovedAtLabel: detail.request.cancellationApprovedAt
        ? formatDateTime(detail.request.cancellationApprovedAt)
        : null,
      refundApprovedAtLabel: detail.request.refundApprovedAt
        ? formatDateTime(detail.request.refundApprovedAt)
        : null,
    },
    booking: {
      reference: detail.order.bookingReference,
      customerEmail: detail.order.contactEmail,
      routeLabel: snapshot.routeLabel,
      airlineName: firstLeg?.ownerName ?? "Airline unavailable",
      departureLabel: firstLeg?.departureLabel ?? "Departure unavailable",
      duffelOrderId: detail.order.duffelOrderId,
      fareConditions: [
        snapshot.conditions.changes,
        snapshot.conditions.refunds,
      ],
      sellAmount: Number(detail.order.sellAmount),
      currency: detail.order.currency,
      sellAmountLabel: formatMoney(
        Number(detail.order.sellAmount),
        detail.order.currency
      ),
    },
    payment: {
      capturedAmount: paymentAmount,
      currency: paymentCurrency,
      providerCaptureId: detail.paymentAttempt?.providerCaptureId ?? null,
    },
    quotes: detail.quotes.map((quote) => ({
      id: quote.id,
      duffelOrderCancellationId: quote.duffelOrderCancellationId,
      refundLabel:
        quote.refundAmount === null || !quote.refundCurrency
          ? "Refund unavailable"
          : formatMoney(quote.refundAmount, quote.refundCurrency),
      refundTo: quote.refundTo ?? "Not provided",
      expiresAtLabel: quote.expiresAt
        ? formatDateTime(quote.expiresAt)
        : "No expiry",
      confirmedAtLabel: quote.confirmedAt
        ? formatDateTime(quote.confirmedAt)
        : null,
    })),
    passengers: snapshot.passengers.map((passenger) => ({
      id: passenger.id,
      label: passenger.label,
      fullName: passenger.fullName,
    })),
    events: detail.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      actorType: event.actorType,
      message: event.message,
      createdAtLabel: formatDateTime(event.createdAt),
    })),
    refunds: detail.refunds.map((refund) => ({
      id: refund.id,
      amountLabel: formatMoney(refund.amount, refund.currency),
      status: refund.status,
      createdAtLabel: formatDateTime(refund.createdAt),
    })),
  }
}

async function requireCancellationDetail(
  requestId: string,
  deps: CancellationServiceDeps
) {
  const detail = await deps.cancellationRepository.getDetail(requestId)
  if (!detail) {
    throw new Error("Cancellation request not found.")
  }
  return detail
}

function assertTransition(
  from: FlightCancellationStatus,
  to: FlightCancellationStatus
) {
  if (!canTransitionCancellationStatus(from, to)) {
    throw new Error(`Cannot move cancellation from ${from} to ${to}.`)
  }
}

async function addAdminEvent(
  deps: CancellationServiceDeps,
  input: { requestId: string; admin: AdminActor },
  eventType: string,
  message: string
) {
  await deps.cancellationRepository.addEvent({
    cancellationRequestId: input.requestId,
    actorType: "admin",
    actorId: input.admin.appUserId,
    eventType,
    message,
  })
}

async function transitionRequestStatus(
  input: {
    requestId: string
    status: FlightCancellationStatus
    patch?: Omit<
      Parameters<CancellationRepository["updateRequest"]>[1],
      "status"
    >
    eventType: string
    eventMessage: string
    actorType: "admin" | "system" | "customer" | "guest"
    actorId: string | null
    notificationType: NotificationEventType
    adminAlert?: boolean
    metadata?: unknown
  },
  deps: CancellationServiceDeps
) {
  const existing = await deps.cancellationRepository.findRequestById(
    input.requestId
  )
  if (!existing) {
    return null
  }
  assertTransition(existing.status, input.status)

  const updated = await deps.cancellationRepository.updateRequest(
    input.requestId,
    {
      ...input.patch,
      status: input.status,
    }
  )
  await deps.cancellationRepository.addEvent({
    cancellationRequestId: input.requestId,
    actorType: input.actorType,
    actorId: input.actorId,
    eventType: input.eventType,
    message: input.eventMessage,
    metadata: input.metadata,
  })
  await enqueueCancellationNotifications(
    {
      requestId: input.requestId,
      eventType: input.notificationType,
      adminAlert: input.adminAlert ?? false,
    },
    deps
  )
  return updated
}

async function enqueueCancellationNotifications(
  input: {
    requestId: string
    eventType: NotificationEventType
    adminAlert?: boolean
  },
  deps: CancellationServiceDeps
) {
  const detail = await deps.cancellationRepository.getDetail(input.requestId)
  if (!detail) {
    return
  }

  const payload = await buildCancellationNotificationPayload(detail, deps)
  await deps.enqueueNotification({
    eventType: input.eventType,
    flightOrderId: detail.order.id,
    checkoutSessionId: detail.order.checkoutSessionId,
    bookingReference: detail.order.bookingReference,
    recipientEmail: detail.order.contactEmail,
    recipientEmailHash: detail.order.contactEmailHash,
    payload: {
      ...payload,
      recipientRole: "customer",
    },
  })

  if (!input.adminAlert) {
    return
  }

  await deps.cancellationRepository.addEvent({
    cancellationRequestId: input.requestId,
    actorType: "system",
    actorId: null,
    eventType: "admin_alert_created",
    message: `Admin alert queued for ${payload.statusLabel}.`,
    metadata: { notificationEventType: input.eventType },
  })

  const recipients = await deps.listAdminAlertRecipients()
  await Promise.all(
    recipients.map((recipient) =>
      deps.enqueueNotification({
        eventType: input.eventType,
        flightOrderId: detail.order.id,
        checkoutSessionId: detail.order.checkoutSessionId,
        bookingReference: detail.order.bookingReference,
        recipientEmail: recipient.email,
        recipientEmailHash: createEmailHash(recipient.email),
        payload: {
          ...payload,
          customerMessage: `Admin alert: ${payload.customerMessage ?? payload.statusLabel}`,
          recipientRole: "admin",
        },
      })
    )
  )
}

async function buildCancellationNotificationPayload(
  detail: CancellationDetailRecord,
  deps: CancellationServiceDeps
) {
  const snapshot = normalizeSnapshot(detail.order.orderSnapshot)
  const settings = await deps.cancellationRepository.getBusinessSettings()

  return {
    bookingReference: detail.order.bookingReference,
    routeLabel: snapshot.routeLabel,
    amountLabel: formatNullableMoney(
      detail.request.customerRefundAmount,
      detail.request.customerRefundCurrency ?? detail.order.currency
    ),
    statusLabel: toStatusLabel(detail.request.status),
    customerMessage: detail.request.customerMessage,
    businessName: settings.businessName,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    supportWhatsapp: settings.supportWhatsapp,
    businessAddress: settings.address,
  }
}

function requireUpdated(updated: CancellationRequestRecord | null) {
  if (!updated) {
    throw new Error("Cancellation request not found.")
  }
  return toCancellationStatusSummary(updated)
}

function createRefundIdempotencyKey(requestId: string) {
  return `flight-cancellation-refund:${requestId}`
}

function toRefundAttemptStatus(
  status: string | undefined
): "completed" | "processing" {
  return status?.toUpperCase() === "COMPLETED" ? "completed" : "processing"
}

function isDeparted(snapshot: ReturnType<typeof normalizeSnapshot>, now: Date) {
  const firstDeparture = snapshot.legs
    .map((leg) => (leg.departureAtIso ? new Date(leg.departureAtIso) : null))
    .find((date): date is Date =>
      Boolean(date && Number.isFinite(date.getTime()))
    )

  return firstDeparture ? firstDeparture.getTime() < now.getTime() : false
}

function resolveCapturedPaymentAmount(
  booking: Pick<FlightOrderRecord, "sellAmount">,
  paymentAttempt: { amount: string | number } | null
) {
  if (paymentAttempt) {
    const amount = Number(paymentAttempt.amount)
    if (Number.isFinite(amount)) {
      return amount
    }
  }

  return booking.sellAmount
}

function toFlightOrderRecord(
  order: CancellationDetailRecord["order"]
): FlightOrderRecord {
  return {
    ...order,
    selectedPartialOffers: Array.isArray(order.selectedPartialOffers)
      ? order.selectedPartialOffers
      : [],
    netAmount: Number(order.netAmount),
    sellAmount: Number(order.sellAmount),
    duffelTotalAmount: Number(order.duffelTotalAmount),
    orderSnapshot:
      order.orderSnapshot && typeof order.orderSnapshot === "object"
        ? (order.orderSnapshot as Record<string, unknown>)
        : {},
  }
}

function toStatusLabel(status: FlightCancellationStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDateTime(value: Date) {
  return format(value, "d MMM yyyy, HH:mm")
}

function formatNullableMoney(amount: number | null, currency: string) {
  return amount === null ? "Not set" : formatMoney(amount, currency)
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
