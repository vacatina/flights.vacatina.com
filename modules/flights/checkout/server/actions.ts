"use server"

import { z, ZodError } from "zod"

import { resolveActionActorContext } from "@/modules/auth/server"
import type { ActorContext } from "@/modules/auth/types"
import {
  parseCheckoutSubmitInput,
  type CheckoutPaymentStartResult,
  type CheckoutSessionStatusResult,
  type CheckoutSubmitInput,
} from "@/modules/flights/checkout/domain"
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/modules/flights/search/server/types"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

interface SubmitCheckoutActionDeps {
  getActorContext?: () => Promise<ActorContext>
  submitCheckout?: (input: {
    actor: ActorContext
    payload: CheckoutSubmitInput
  }) => Promise<{
    checkoutSessionId: string
    flightOrderId: string
    duffelOrderId: string
    bookingReference: string
    paymentMode: "pay_now" | "hold"
    totalSellAmountLabel: string
    paymentRequiredByLabel: string | null
  }>
}

interface CreatePayPalOrderActionDeps {
  getActorContext?: () => Promise<ActorContext>
  createCheckoutPayPalOrder?: (input: {
    actor: ActorContext
    payload: CheckoutSubmitInput
  }) => Promise<CheckoutPaymentStartResult>
}

interface CapturePayPalOrderActionDeps {
  getActorContext?: () => Promise<ActorContext>
  captureCheckoutPayPalOrder?: (input: {
    actor: ActorContext
    checkoutSessionId: string
    paypalOrderId: string
  }) => Promise<CheckoutSessionStatusResult>
}

interface CheckoutSessionStatusActionDeps {
  getActorContext?: () => Promise<ActorContext>
  getCheckoutSessionStatus?: (input: {
    actor: ActorContext
    checkoutSessionId: string
  }) => Promise<CheckoutSessionStatusResult>
}

type SubmitCheckoutSuccess = {
  checkoutSessionId: string
  flightOrderId: string
  duffelOrderId: string
  bookingReference: string
  paymentMode: "pay_now" | "hold"
  totalSellAmountLabel: string
  paymentRequiredByLabel: string | null
}

const checkoutSessionStatusSchema = z.object({
  checkoutSessionId: z.string().trim().min(1),
})

const paypalCaptureSchema = z.object({
  checkoutSessionId: z.string().trim().min(1),
  paypalOrderId: z.string().trim().min(1),
})

export async function submitCheckoutAction(
  input: unknown
): Promise<ActionResult<SubmitCheckoutSuccess>> {
  return executeSubmitCheckoutAction(input)
}

export async function executeSubmitCheckoutAction(
  input: unknown,
  deps: SubmitCheckoutActionDeps = {}
): Promise<ActionResult<SubmitCheckoutSuccess>> {
  let actor: ActorContext

  try {
    actor = await resolveActionActorContext({
      scope: "checkout.actions",
      resolveActor: deps.getActorContext,
    })
  } catch (error) {
    logFlightFlowError("submitCheckoutAction", "actor_resolution_failed", error, {
      inputType: typeof input,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not verify the current session. Please refresh and try again."
    )
  }
  logFlightFlow("submitCheckoutAction", "received", {
    actorType: actor.type,
    inputType: typeof input,
  })

  let payload: CheckoutSubmitInput

  try {
    payload = parseCheckoutSubmitInput(input)
  } catch (error) {
    if (error instanceof ZodError) {
      return actionFailure(
        "VALIDATION_ERROR",
        error.issues[0]?.message ?? "Invalid checkout payload"
      )
    }

    return actionFailure("VALIDATION_ERROR", "Invalid checkout payload")
  }

  if (payload.paymentMode !== "hold") {
    return actionFailure(
      "VALIDATION_ERROR",
      "Pay now checkout must be started through PayPal."
    )
  }

  try {
    const submitCheckout = deps.submitCheckout ?? (await getCheckoutSubmitter())
    const result: SubmitCheckoutSuccess = await submitCheckout({
      actor,
      payload,
    })
    return actionSuccess(result)
  } catch (error) {
    logFlightFlowError("submitCheckoutAction", "failed", error, {
      partialOfferRequestId: payload.partialOfferRequestId,
      offerId: payload.offerId,
      paymentMode: payload.paymentMode,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not complete checkout right now. Please try again."
    )
  }
}

export async function createPayPalOrderAction(
  input: unknown
): Promise<ActionResult<CheckoutPaymentStartResult>> {
  return executeCreatePayPalOrderAction(input)
}

export async function executeCreatePayPalOrderAction(
  input: unknown,
  deps: CreatePayPalOrderActionDeps = {}
): Promise<ActionResult<CheckoutPaymentStartResult>> {
  let actor: ActorContext

  try {
    actor = await resolveActionActorContext({
      scope: "checkout.actions",
      resolveActor: deps.getActorContext,
    })
  } catch (error) {
    logFlightFlowError("createPayPalOrderAction", "actor_resolution_failed", error, {
      inputType: typeof input,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not verify the current session. Please refresh and try again."
    )
  }

  let payload: CheckoutSubmitInput

  try {
    payload = parseCheckoutSubmitInput(input)
  } catch (error) {
    if (error instanceof ZodError) {
      return actionFailure(
        "VALIDATION_ERROR",
        error.issues[0]?.message ?? "Invalid checkout payload"
      )
    }

    return actionFailure("VALIDATION_ERROR", "Invalid checkout payload")
  }

  if (payload.paymentMode !== "pay_now") {
    return actionFailure("VALIDATION_ERROR", "Invalid payment mode for pay now.")
  }

  try {
    const createCheckoutPayPalOrder =
      deps.createCheckoutPayPalOrder ?? (await getPayPalOrderCreator())
    const result = await createCheckoutPayPalOrder({
      actor,
      payload,
    })
    return actionSuccess(result)
  } catch (error) {
    logFlightFlowError("createPayPalOrderAction", "failed", error, {
      partialOfferRequestId: payload.partialOfferRequestId,
      offerId: payload.offerId,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not create PayPal order right now. Please try again."
    )
  }
}

export async function capturePayPalOrderAction(
  input: unknown
): Promise<ActionResult<CheckoutSessionStatusResult>> {
  return executeCapturePayPalOrderAction(input)
}

export async function executeCapturePayPalOrderAction(
  input: unknown,
  deps: CapturePayPalOrderActionDeps = {}
): Promise<ActionResult<CheckoutSessionStatusResult>> {
  let actor: ActorContext

  try {
    actor = await resolveActionActorContext({
      scope: "checkout.actions",
      resolveActor: deps.getActorContext,
    })
  } catch (error) {
    logFlightFlowError("capturePayPalOrderAction", "actor_resolution_failed", error, {
      inputType: typeof input,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not verify the current session. Please refresh and try again."
    )
  }

  const parsed = paypalCaptureSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid PayPal capture request"
    )
  }

  try {
    const captureCheckoutPayPalOrder =
      deps.captureCheckoutPayPalOrder ?? (await getPayPalOrderCapturer())
    const result = await captureCheckoutPayPalOrder({
      actor,
      checkoutSessionId: parsed.data.checkoutSessionId,
      paypalOrderId: parsed.data.paypalOrderId,
    })
    return actionSuccess(result)
  } catch (error) {
    logFlightFlowError("capturePayPalOrderAction", "failed", error, {
      checkoutSessionId: parsed.data.checkoutSessionId,
      paypalOrderId: parsed.data.paypalOrderId,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not capture PayPal payment right now. Please try again."
    )
  }
}

export async function getCheckoutSessionStatusAction(
  input: unknown
): Promise<ActionResult<CheckoutSessionStatusResult>> {
  return executeGetCheckoutSessionStatusAction(input)
}

export async function executeGetCheckoutSessionStatusAction(
  input: unknown,
  deps: CheckoutSessionStatusActionDeps = {}
): Promise<ActionResult<CheckoutSessionStatusResult>> {
  let actor: ActorContext

  try {
    actor = await resolveActionActorContext({
      scope: "checkout.actions",
      resolveActor: deps.getActorContext,
    })
  } catch (error) {
    logFlightFlowError("getCheckoutSessionStatusAction", "actor_resolution_failed", error, {
      inputType: typeof input,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not verify the current session. Please refresh and try again."
    )
  }

  const parsed = checkoutSessionStatusSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid checkout session request"
    )
  }

  try {
    const getCheckoutSessionStatus =
      deps.getCheckoutSessionStatus ?? (await getCheckoutSessionStatusResolver())
    const result = await getCheckoutSessionStatus({
      actor,
      checkoutSessionId: parsed.data.checkoutSessionId,
    })
    return actionSuccess(result)
  } catch (error) {
    logFlightFlowError("getCheckoutSessionStatusAction", "failed", error, {
      checkoutSessionId: parsed.data.checkoutSessionId,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not fetch checkout session status right now."
    )
  }
}

async function getCheckoutSubmitter() {
  const { submitCheckout } = await import("@/modules/flights/checkout/server/service")
  return submitCheckout
}

async function getPayPalOrderCreator() {
  const { startPayPalPayment } = await import("@/modules/payments/server/service")
  return startPayPalPayment
}

async function getPayPalOrderCapturer() {
  const { capturePayPalPayment } = await import("@/modules/payments/server/service")
  return capturePayPalPayment
}

async function getCheckoutSessionStatusResolver() {
  const { getPaymentAttemptStatus } = await import("@/modules/payments/server/service")
  return getPaymentAttemptStatus
}
