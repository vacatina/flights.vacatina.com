import { z } from "zod"

import type {
  CheckoutUrlState,
  CheckoutWizardStep,
} from "@/modules/flights/checkout/domain/types"
import { logFlightFlow } from "@/lib/logging/flow-debug"

const checkoutQuerySchema = z.object({
  offer: z.string().min(1),
  selected: z.string().min(1),
  quote: z.string().min(1),
  step: z.string().optional(),
})
const checkoutStepSchema = z.enum(["traveler", "extras", "pay"])

type SearchParamInput = Record<string, string | string[] | undefined>

export function parseCheckoutUrlState(
  searchParams: SearchParamInput
): CheckoutUrlState {
  const parsed = checkoutQuerySchema.safeParse({
    offer: firstValue(searchParams.offer),
    selected: firstValue(searchParams.selected),
    quote: firstValue(searchParams.quote),
    step: firstValue(searchParams.step),
  })

  if (!parsed.success) {
    logFlightFlow("parseCheckoutUrlState", "parse_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    throw new Error("Invalid checkout link. Please return to fare options.")
  }

  const state = {
    offerId: parsed.data.offer.trim(),
    selectedPartialOffers: parseSelected(parsed.data.selected),
    quoteId: parsed.data.quote.trim(),
    step: parseStep(parsed.data.step),
  }

  if (state.selectedPartialOffers.length === 0) {
    throw new Error("Invalid checkout state. Please return to fare options.")
  }

  return state
}

export function toCheckoutUrlSearchParams(state: CheckoutUrlState) {
  const params = new URLSearchParams()
  params.set("offer", state.offerId)
  params.set("selected", state.selectedPartialOffers.join(","))
  params.set("quote", state.quoteId)

  if (state.step !== "traveler") {
    params.set("step", state.step)
  }

  return params
}

function parseSelected(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parseStep(value: string | undefined): CheckoutWizardStep {
  const parsed = checkoutStepSchema.safeParse(value)

  if (!parsed.success) {
    return "traveler"
  }

  return parsed.data
}
