import "server-only"

import "@/modules/flights/payments-adapter/register"
import type {
  CheckoutPaymentStartResult,
  CheckoutSessionStatusResult,
  CheckoutSubmitInput,
} from "@/modules/flights/checkout/domain"
import {
  captureCheckoutPayPalOrder,
  createCheckoutPayPalOrder,
  getCheckoutSessionStatus,
} from "@/modules/flights/checkout/server/service-core"
import { logFlightFlowError } from "@/lib/logging/flow-debug"
import {
  defaultCheckoutSessionRepository,
  type CheckoutSessionRecord,
  type CheckoutSessionRepository,
} from "@/modules/flights/checkout/server/session-repository"
import type { ActorContext } from "@/modules/auth/types"
import type { PaymentAttemptRecord, PaymentAttemptsRepository } from "@/modules/payments/server/attempts-repository"
import { defaultPaymentAttemptsRepository } from "@/modules/payments/server/attempts-repository"
import type { PaymentEventsRepository } from "@/modules/payments/server/events-repository"
import { defaultPaymentEventsRepository } from "@/modules/payments/server/events-repository"
import { createPaymentAttemptId, createPaymentEventId } from "@/modules/payments/server/ids"
import type { PaymentAttemptStatus, PaymentEventType } from "@/modules/payments/domain"

export interface StartPayPalPaymentInput {
  actor: ActorContext
  payload: CheckoutSubmitInput
}

export interface CapturePayPalPaymentInput {
  actor: ActorContext
  checkoutSessionId: string
  paypalOrderId: string
}

export interface GetPaymentStatusInput {
  actor: ActorContext
  checkoutSessionId: string
}

interface PaymentServiceDeps {
  sessionRepository: CheckoutSessionRepository
  attemptsRepository: PaymentAttemptsRepository
  eventsRepository: PaymentEventsRepository
}

const defaultDeps: PaymentServiceDeps = {
  sessionRepository: defaultCheckoutSessionRepository,
  attemptsRepository: defaultPaymentAttemptsRepository,
  eventsRepository: defaultPaymentEventsRepository,
}

export async function startPayPalPayment(
  input: StartPayPalPaymentInput,
  deps: PaymentServiceDeps = defaultDeps
): Promise<CheckoutPaymentStartResult> {
  const result = await createCheckoutPayPalOrder(input)
  const session = await requireCheckoutSession(deps.sessionRepository, result.checkoutSessionId)
  const attempt = await ensurePaymentAttemptForSession({
    session,
    deps,
    status: "provider_order_created",
  })

  await appendEventOnce({
    deps,
    attempt,
    eventType: "PAYMENT_INITIATED",
  })
  await appendEventOnce({
    deps,
    attempt,
    eventType: "PROVIDER_ORDER_CREATED",
  })

  if (!session.paymentAttemptId) {
    await deps.sessionRepository.update(session.id, {
      paymentAttemptId: attempt.id,
    })
  }

  return result
}

export async function capturePayPalPayment(
  input: CapturePayPalPaymentInput,
  deps: PaymentServiceDeps = defaultDeps
): Promise<CheckoutSessionStatusResult> {
  const session = await requireCheckoutSession(deps.sessionRepository, input.checkoutSessionId)
  const attempt = await ensurePaymentAttemptForSession({
    session,
    deps,
    status: "buyer_approved",
  })

  await appendEventOnce({
    deps,
    attempt,
    eventType: "BUYER_APPROVED",
  })
  await appendEventOnce({
    deps,
    attempt,
    eventType: "CAPTURE_REQUESTED",
  })
  await deps.attemptsRepository.update(attempt.id, {
    status: "capture_pending",
  })

  const result = await captureCheckoutPayPalOrder(input)
  const refreshedSession =
    (await deps.sessionRepository.findById(input.checkoutSessionId)) ?? session
  const nextStatus = toAttemptStatus(refreshedSession.status)

  const updatedAttempt = await deps.attemptsRepository.update(attempt.id, {
    status: nextStatus,
    providerCaptureId: refreshedSession.providerPaymentId,
    providerStatus: refreshedSession.providerStatusCode,
    failureCode: refreshedSession.errorCode,
    failureMessage: refreshedSession.errorMessage,
  })

  if (nextStatus === "capture_completed" || nextStatus === "fulfilled") {
    await appendEventOnce({
      deps,
      attempt:
        updatedAttempt ?? {
          ...attempt,
          status: nextStatus,
          providerCaptureId: refreshedSession.providerPaymentId,
          providerStatus: refreshedSession.providerStatusCode,
        },
      eventType: "CAPTURE_COMPLETED",
    })
    await tryProcessCapturedPaymentFulfillment({
      paymentAttemptId: attempt.id,
      checkoutSessionId: input.checkoutSessionId,
      deps,
    })
  } else if (nextStatus === "capture_failed" || nextStatus === "capture_denied") {
    await appendEventOnce({
      deps,
      attempt:
        updatedAttempt ?? {
          ...attempt,
          status: nextStatus,
          providerCaptureId: refreshedSession.providerPaymentId,
          providerStatus: refreshedSession.providerStatusCode,
        },
      eventType: "CAPTURE_DENIED",
    })
  }

  if (nextStatus === "capture_completed") {
    return getCheckoutSessionStatus(input)
  }

  return result
}

export async function getPaymentAttemptStatus(
  input: GetPaymentStatusInput
): Promise<CheckoutSessionStatusResult> {
  return getCheckoutSessionStatus(input)
}

async function requireCheckoutSession(
  sessionRepository: CheckoutSessionRepository,
  checkoutSessionId: string
) {
  const session = await sessionRepository.findById(checkoutSessionId)

  if (!session) {
    throw new Error("Checkout session not found.")
  }

  return session
}

async function ensurePaymentAttemptForSession(input: {
  session: CheckoutSessionRecord
  deps: PaymentServiceDeps
  status: PaymentAttemptStatus
}) {
  const existing = input.session.paymentAttemptId
    ? await input.deps.attemptsRepository.findById(input.session.paymentAttemptId)
    : null

  if (existing) {
    return existing
  }

  return input.deps.attemptsRepository.createOrFindByIdempotency({
    id: createPaymentAttemptId(),
    internalOrderType: "flight_checkout",
    internalOrderId: input.session.id,
    ownerUserId: input.session.ownerUserId,
    ownerGuestId: input.session.ownerGuestId,
    ownerOrgId: input.session.ownerOrgId,
    provider: "paypal",
    status: input.status,
    currency: input.session.paymentCurrency ?? input.session.currency,
    amount: input.session.paymentAmount ?? input.session.sellAmount,
    providerOrderId: input.session.providerOrderId,
    providerCaptureId: input.session.providerPaymentId,
    providerStatus: input.session.providerStatusCode,
    createIdempotencyKey: `paypal:create:${input.session.id}`,
    captureIdempotencyKey: `paypal:capture:${input.session.providerOrderId ?? input.session.id}`,
    clientIdempotencyKey: input.session.idempotencyKey,
    checkoutPayloadSnapshot: input.session.checkoutPayloadSnapshot,
  })
}

async function appendEventOnce(input: {
  deps: PaymentServiceDeps
  attempt: PaymentAttemptRecord
  eventType: PaymentEventType
}) {
  const existing = await input.deps.eventsRepository.listByAttemptId(input.attempt.id)

  if (existing.some((event) => event.eventType === input.eventType)) {
    return
  }

  await input.deps.eventsRepository.append({
    id: createPaymentEventId(),
    paymentAttemptId: input.attempt.id,
    eventType: input.eventType,
    provider: input.attempt.provider,
    providerOrderId: input.attempt.providerOrderId,
    providerCaptureId: input.attempt.providerCaptureId,
    amount: input.attempt.amount,
    currency: input.attempt.currency,
  })
}

async function tryProcessCapturedPaymentFulfillment(input: {
  paymentAttemptId: string
  checkoutSessionId: string
  deps: PaymentServiceDeps
}) {
  try {
    const { processPaymentOutboxByPaymentAttemptId } = await import(
      "@/modules/payments/server/workers/outbox-worker"
    )
    await processPaymentOutboxByPaymentAttemptId({
      paymentAttemptId: input.paymentAttemptId,
    })
  } catch (error) {
    logFlightFlowError("payments.capture", "opportunistic_fulfillment_failed", error, {
      paymentAttemptId: input.paymentAttemptId,
    })

    if (isPassengerDobTypeMismatchError(error)) {
      await input.deps.sessionRepository.update(input.checkoutSessionId, {
        status: "reconciliation_required",
        errorCode: "passenger_dob_type_mismatch",
        errorMessage:
          "Payment was received, but the passenger date of birth does not match the selected passenger type. Support will reconcile this booking.",
      })
    }
  }
}

function isPassengerDobTypeMismatchError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("date of birth does not match") ||
      error.message.includes("does not match date of birth") ||
      error.message.includes("born_on_does_not_match"))
  )
}

function toAttemptStatus(status: CheckoutSessionRecord["status"]): PaymentAttemptStatus {
  switch (status) {
    case "completed":
      return "fulfilled"
    case "finalizing":
      return "fulfillment_pending"
    case "payment_authorized":
      return "capture_completed"
    case "failed":
      return "capture_failed"
    case "reconciliation_required":
      return "reconciliation_required"
    case "processing":
    default:
      return "capture_pending"
  }
}
