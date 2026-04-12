"use server"

import { ZodError } from "zod"

import { getActorContext } from "@/modules/auth/server"
import type { ActorContext } from "@/modules/auth/types"
import {
  parseCheckoutSubmitInput,
  type CheckoutSubmitInput,
} from "@/modules/flights/checkout/domain"
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/modules/flights/search/server/types"
import { logFlightFlow, logFlightFlowError } from "@/modules/flights/shared/flow-debug"

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

type SubmitCheckoutSuccess = {
  checkoutSessionId: string
  flightOrderId: string
  duffelOrderId: string
  paymentMode: "pay_now" | "hold"
  totalSellAmountLabel: string
  paymentRequiredByLabel: string | null
}

export async function submitCheckoutAction(
  input: unknown
): Promise<
  ActionResult<SubmitCheckoutSuccess>
> {
  return executeSubmitCheckoutAction(input)
}

export async function executeSubmitCheckoutAction(
  input: unknown,
  deps: SubmitCheckoutActionDeps = {}
): Promise<ActionResult<SubmitCheckoutSuccess>> {
  const actor = await resolveActionActorContext(deps.getActorContext)
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
      error instanceof Error ? error.message : "Could not complete checkout."
    )
  }
}

async function resolveActionActorContext(
  resolveActor?: () => Promise<ActorContext>
): Promise<ActorContext> {
  try {
    return await (resolveActor?.() ?? getActorContext())
  } catch (error) {
    logFlightFlowError("checkout.actions", "resolve_actor_fallback_to_guest", error)
    return {
      type: "guest",
      guestId: "guest_unavailable",
    }
  }
}

async function getCheckoutSubmitter() {
  const { submitCheckout } = await import("@/modules/flights/checkout/server/service")
  return submitCheckout
}
