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
    paymentMode: "pay_now" | "hold"
    totalSellAmountLabel: string
    paymentRequiredByLabel: string | null
  }>
}

interface StartCheckoutPaymentActionDeps {
  getActorContext?: () => Promise<ActorContext>
  startCheckoutPayment?: (input: {
    actor: ActorContext
    payload: CheckoutSubmitInput
  }) => Promise<CheckoutPaymentStartResult>
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
  paymentMode: "pay_now" | "hold"
  totalSellAmountLabel: string
  paymentRequiredByLabel: string | null
}

const checkoutSessionStatusSchema = z.object({
  checkoutSessionId: z.string().trim().min(1),
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
  const actor = await resolveActionActorContext({
    scope: "checkout.actions",
    resolveActor: deps.getActorContext,
  })
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
      "Pay now checkout must be started through the payment initialization action."
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

export async function startCheckoutPaymentAction(
  input: unknown
): Promise<ActionResult<CheckoutPaymentStartResult>> {
  return executeStartCheckoutPaymentAction(input)
}

export async function executeStartCheckoutPaymentAction(
  input: unknown,
  deps: StartCheckoutPaymentActionDeps = {}
): Promise<ActionResult<CheckoutPaymentStartResult>> {
  const actor = await resolveActionActorContext({
    scope: "checkout.actions",
    resolveActor: deps.getActorContext,
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

  if (payload.paymentMode !== "pay_now") {
    return actionFailure("VALIDATION_ERROR", "Invalid payment mode for pay now.")
  }

  try {
    const startCheckoutPayment =
      deps.startCheckoutPayment ?? (await getCheckoutPaymentStarter())
    const result = await startCheckoutPayment({
      actor,
      payload,
    })
    return actionSuccess(result)
  } catch (error) {
    logFlightFlowError("startCheckoutPaymentAction", "failed", error, {
      partialOfferRequestId: payload.partialOfferRequestId,
      offerId: payload.offerId,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not start payment right now. Please try again."
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
  const actor = await resolveActionActorContext({
    scope: "checkout.actions",
    resolveActor: deps.getActorContext,
  })

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

async function getCheckoutPaymentStarter() {
  const { startCheckoutPayment } = await import("@/modules/flights/checkout/server/service")
  return startCheckoutPayment
}

async function getCheckoutSessionStatusResolver() {
  const { getCheckoutSessionStatus } = await import("@/modules/flights/checkout/server/service")
  return getCheckoutSessionStatus
}
