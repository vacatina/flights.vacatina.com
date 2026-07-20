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
import { logFlightFlowError } from "@/lib/logging/flow-debug"
import {
  capturePayPalPayment,
  getPaymentAttemptStatus,
  startPayPalPayment,
} from "@/modules/payments/server/service"

interface StartPayPalPaymentActionDeps {
  getActorContext?: () => Promise<ActorContext>
  startPayPalPayment?: (input: {
    actor: ActorContext
    payload: CheckoutSubmitInput
  }) => Promise<CheckoutPaymentStartResult>
}

interface CapturePayPalPaymentActionDeps {
  getActorContext?: () => Promise<ActorContext>
  capturePayPalPayment?: (input: {
    actor: ActorContext
    checkoutSessionId: string
    paypalOrderId: string
  }) => Promise<CheckoutSessionStatusResult>
  getPaymentAttemptStatus?: (input: {
    actor: ActorContext
    checkoutSessionId: string
  }) => Promise<CheckoutSessionStatusResult>
}

interface PaymentStatusActionDeps {
  getActorContext?: () => Promise<ActorContext>
  getPaymentAttemptStatus?: (input: {
    actor: ActorContext
    checkoutSessionId: string
  }) => Promise<CheckoutSessionStatusResult>
}

const paymentStatusSchema = z.object({
  checkoutSessionId: z.string().trim().min(1),
})

const paypalCaptureSchema = z.object({
  checkoutSessionId: z.string().trim().min(1),
  paypalOrderId: z.string().trim().min(1),
})

export async function startPayPalPaymentAction(
  input: unknown
): Promise<ActionResult<CheckoutPaymentStartResult>> {
  return executeStartPayPalPaymentAction(input)
}

export async function executeStartPayPalPaymentAction(
  input: unknown,
  deps: StartPayPalPaymentActionDeps = {}
): Promise<ActionResult<CheckoutPaymentStartResult>> {
  let actor: ActorContext

  try {
    actor = await resolveActionActorContext({
      scope: "payments.actions",
      resolveActor: deps.getActorContext,
    })
  } catch (error) {
    logFlightFlowError("startPayPalPaymentAction", "actor_resolution_failed", error)
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
    const runner = deps.startPayPalPayment ?? startPayPalPayment
    return actionSuccess(await runner({ actor, payload }))
  } catch (error) {
    logFlightFlowError("startPayPalPaymentAction", "failed", error, {
      partialOfferRequestId: payload.partialOfferRequestId,
      offerId: payload.offerId,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not create PayPal order right now. Please try again."
    )
  }
}

export async function capturePayPalPaymentAction(
  input: unknown
): Promise<ActionResult<CheckoutSessionStatusResult>> {
  return executeCapturePayPalPaymentAction(input)
}

export async function executeCapturePayPalPaymentAction(
  input: unknown,
  deps: CapturePayPalPaymentActionDeps = {}
): Promise<ActionResult<CheckoutSessionStatusResult>> {
  let actor: ActorContext

  try {
    actor = await resolveActionActorContext({
      scope: "payments.actions",
      resolveActor: deps.getActorContext,
    })
  } catch (error) {
    logFlightFlowError("capturePayPalPaymentAction", "actor_resolution_failed", error)
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
    const runner = deps.capturePayPalPayment ?? capturePayPalPayment
    return actionSuccess(await runner({ actor, ...parsed.data }))
  } catch (error) {
    logFlightFlowError("capturePayPalPaymentAction", "failed", error, parsed.data)
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not capture PayPal payment right now. Please try again."
    )
  }
}

export async function getPaymentStatusAction(
  input: unknown
): Promise<ActionResult<CheckoutSessionStatusResult>> {
  return executeGetPaymentStatusAction(input)
}

export async function executeGetPaymentStatusAction(
  input: unknown,
  deps: PaymentStatusActionDeps = {}
): Promise<ActionResult<CheckoutSessionStatusResult>> {
  let actor: ActorContext

  try {
    actor = await resolveActionActorContext({
      scope: "payments.actions",
      resolveActor: deps.getActorContext,
    })
  } catch (error) {
    logFlightFlowError("getPaymentStatusAction", "actor_resolution_failed", error)
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not verify the current session. Please refresh and try again."
    )
  }

  const parsed = paymentStatusSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid payment status request"
    )
  }

  try {
    const runner = deps.getPaymentAttemptStatus ?? getPaymentAttemptStatus
    return actionSuccess(await runner({
      actor,
      checkoutSessionId: parsed.data.checkoutSessionId,
    }))
  } catch (error) {
    logFlightFlowError("getPaymentStatusAction", "failed", error, parsed.data)
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not fetch checkout session status right now."
    )
  }
}
