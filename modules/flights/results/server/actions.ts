"use server"

import type { Offer, OfferRequest } from "@duffel/api/types"
import { z } from "zod"

import { resolveActionActorContext } from "@/modules/auth/server"
import type { ActorContext } from "@/modules/auth/types"
import { GUEST_UNAVAILABLE_ID } from "@/modules/auth/constants"
import {
  createPricedQuote as createPricedQuoteFromPricingService,
  getOfferPricingMap as getOfferPricingMapFromPricingService,
} from "@/modules/flights/pricing/server"
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/modules/flights/search/server/types"
import { fetchFareOptionsData } from "@/modules/flights/results/server/service"
import type { OfferCardViewModel } from "@/modules/flights/results/domain"
import {
  logFlightFlow,
  logFlightFlowError,
} from "@/lib/logging/flow-debug"
import { normalizeSelectedStrings } from "@/lib/shared/selection"

const loadMoreFareOptionsSchema = z.object({
  partialOfferRequestId: z.string().min(1),
  state: z.object({
    leg: z.number().int().min(0),
    selected: z.array(z.string()),
    sort: z.enum([
      "least_expensive",
      "most_expensive",
      "shortest_duration",
      "longest_duration",
    ]),
    stops: z.enum(["direct", "max_1", "max_2", "any"]),
    airline: z.string().optional(),
    flightNumber: z.string().optional(),
    takeoffFrom: z.number().int().min(0).max(1439),
    takeoffTo: z.number().int().min(0).max(1439),
    landingFrom: z.number().int().min(0).max(1439),
    landingTo: z.number().int().min(0).max(1439),
    after: z.string().optional(),
  }),
})

const createCheckoutQuoteSchema = z.object({
  partialOfferRequestId: z.string().min(1),
  selected: z.array(z.string().min(1)).min(1),
  offerId: z.string().min(1),
})

interface CreateCheckoutQuoteDeps {
  getFaresBySelected: (
    partialOfferRequestId: string,
    selectedPartialOffers: string[]
  ) => Promise<OfferRequest>
  getOfferPricingMap: (
    offers: Offer[]
  ) => Promise<Record<string, { sellAmount: number; netAmount: number; currency: string; appliedRuleId: string | null; appliedRuleSpecificity: number | null }>>
  createPricedQuote: (input: {
    partialOfferRequestId: string
    offerId: string
    selectedPartialOffers: string[]
    ownerUserId?: string | null
    ownerGuestId?: string | null
    ownerOrgId?: string | null
    pricing: {
      offerId: string
      currency: string
      netAmount: number
      sellAmount: number
      appliedRuleId: string | null
      appliedRuleSpecificity: number | null
    }
  }) => Promise<{ id: string; expiresAt: Date }>
  getActorContext?: () => Promise<ActorContext>
}

export async function loadMoreFareOptionsAction(
  input: unknown
): Promise<ActionResult<{ offers: OfferCardViewModel[]; after: string | null }>> {
  const actor = await resolveActionActorContext({
    scope: "results.actions",
  })
  logFlightFlow("loadMoreFareOptionsAction", "received_input", {
    inputType: typeof input,
    actorType: actor.type,
  })
  const parsed = loadMoreFareOptionsSchema.safeParse(input)

  if (!parsed.success) {
    logFlightFlow("loadMoreFareOptionsAction", "validation_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return actionFailure("VALIDATION_ERROR", "Invalid load-more request")
  }

  try {
    logFlightFlow("loadMoreFareOptionsAction", "fetch_started", {
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      leg: parsed.data.state.leg,
      selectedCount: parsed.data.state.selected.length,
      after: parsed.data.state.after,
    })
    const result = await fetchFareOptionsData({
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      state: parsed.data.state,
    })

    logFlightFlow("loadMoreFareOptionsAction", "fetch_succeeded", {
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      offerCount: result.offers.length,
      after: result.after,
    })

    return actionSuccess({
      offers: result.offers,
      after: result.after,
    })
  } catch (error) {
    logFlightFlowError("loadMoreFareOptionsAction", "fetch_failed", error, {
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      leg: parsed.data.state.leg,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      error instanceof Error
        ? error.message
        : "Could not load more offers right now."
    )
  }
}

export async function createCheckoutQuoteAction(
  input: unknown
): Promise<ActionResult<{ quoteId: string; expiresAt: string }>> {
  return executeCreateCheckoutQuoteAction(input)
}

export async function executeCreateCheckoutQuoteAction(
  input: unknown,
  deps: CreateCheckoutQuoteDeps = defaultCreateCheckoutQuoteDeps
): Promise<ActionResult<{ quoteId: string; expiresAt: string }>> {
  const actor = await resolveActionActorContext({
    scope: "results.actions",
    resolveActor: deps.getActorContext,
  })
  logFlightFlow("createCheckoutQuoteAction", "received_input", {
    inputType: typeof input,
    actorType: actor.type,
  })

  const parsed = createCheckoutQuoteSchema.safeParse(input)

  if (!parsed.success) {
    logFlightFlow("createCheckoutQuoteAction", "validation_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return actionFailure("VALIDATION_ERROR", "Invalid checkout quote request")
  }

  const selected = normalizeSelectedStrings(parsed.data.selected)

  if (selected.length !== parsed.data.selected.length) {
    logFlightFlow("createCheckoutQuoteAction", "validation_failed_selected_items", {
      selectedCount: parsed.data.selected.length,
      normalizedSelectedCount: selected.length,
    })
    return actionFailure("VALIDATION_ERROR", "Invalid selected offers state")
  }

  if (new Set(selected).size !== selected.length) {
    logFlightFlow("createCheckoutQuoteAction", "validation_failed_duplicate_selected", {
      selectedCount: selected.length,
    })
    return actionFailure("VALIDATION_ERROR", "Duplicate selected offers are not allowed")
  }

  try {
    const offerRequest = await deps.getFaresBySelected(
      parsed.data.partialOfferRequestId,
      selected
    )
    const fares = offerRequest.offers as Offer[]
    const selectedOffer = fares.find((offer) => offer.id === parsed.data.offerId)

    if (!selectedOffer) {
      logFlightFlow("createCheckoutQuoteAction", "offer_not_found", {
        partialOfferRequestId: parsed.data.partialOfferRequestId,
        offerId: parsed.data.offerId,
      })
      return actionFailure(
        "VALIDATION_ERROR",
        "Selected fare is no longer available. Please choose a fare again."
      )
    }

    const pricingByOfferId = await deps.getOfferPricingMap(fares)
    const pricing = pricingByOfferId[selectedOffer.id]

    if (!pricing) {
      logFlightFlow("createCheckoutQuoteAction", "pricing_not_found", {
        partialOfferRequestId: parsed.data.partialOfferRequestId,
        offerId: selectedOffer.id,
      })
      return actionFailure(
        "UPSTREAM_ERROR",
        "Could not price this fare right now. Please try again."
      )
    }

    const quote = await deps.createPricedQuote({
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      offerId: selectedOffer.id,
      selectedPartialOffers: selected,
      ownerUserId: actor.type === "user" ? actor.appUserId : null,
      ownerGuestId:
        actor.type === "guest" && actor.guestId !== GUEST_UNAVAILABLE_ID
          ? actor.guestId
          : null,
      ownerOrgId: null,
      pricing: {
        offerId: selectedOffer.id,
        ...pricing,
      },
    })

    logFlightFlow("createCheckoutQuoteAction", "quote_created", {
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      offerId: selectedOffer.id,
      quoteId: quote.id,
      selectedCount: selected.length,
      actorType: actor.type,
    })

    return actionSuccess({
      quoteId: quote.id,
      expiresAt: quote.expiresAt.toISOString(),
    })
  } catch (error) {
    logFlightFlowError("createCheckoutQuoteAction", "quote_creation_failed", error, {
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      offerId: parsed.data.offerId,
      selectedCount: selected.length,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      error instanceof Error
        ? error.message
        : "Could not create checkout quote right now."
    )
  }
}

const defaultCreateCheckoutQuoteDeps: CreateCheckoutQuoteDeps = {
  async getFaresBySelected(partialOfferRequestId, selectedPartialOffers) {
    const { getDuffelClient } = await import("@/lib/duffel")
    const client = getDuffelClient()
    const response = await client.partialOfferRequests.getFaresById(
      partialOfferRequestId,
      {
        "selected_partial_offer[]": selectedPartialOffers,
      }
    )

    return response.data as OfferRequest
  },
  async getOfferPricingMap(offers) {
    return getOfferPricingMapFromPricingService(offers)
  },
  async createPricedQuote(input) {
    return createPricedQuoteFromPricingService(input)
  },
}
