import type { Offer, OfferRequest } from "@duffel/api/types"

import { getDuffelFlightConfig } from "@/lib/duffel/config"
import {
  applyOfferClientFilters,
  applyOfferClientSorting,
  createLegBreadcrumbs,
  createSearchSummary,
  normalizeOfferForLeg,
  toDuffelListOffersSort,
  toDuffelMaxConnections,
  type FareOptionsPageData,
  type ResultsUrlState,
} from "@/modules/flights/results/domain"
import {
  logDuffelError,
  mapDuffelErrorMessage,
} from "@/modules/flights/results/server/error-map"
import {
  getAirlineIdsFromOffers,
  getAirlineLogosByAirlineId,
} from "@/modules/flights/results/server/airline-logos"
import {
  formatCurrencyAmount,
  getOfferPricingMap as getOfferPricingMapFromService,
  summarizeOfferPricing,
} from "@/modules/flights/pricing/server"
import {
  logFlightFlow,
  logFlightFlowError,
} from "@/modules/flights/shared/flow-debug"

const duffelConfig = getDuffelFlightConfig()
const INVALID_SELECTION_STATE_MESSAGE =
  "Invalid fare selection state. Please reselect flights from the first leg."

interface FetchFareOptionsDeps {
  getBaseOfferRequest: (partialOfferRequestId: string) => Promise<OfferRequest>
  getOfferRequestBySelected: (
    partialOfferRequestId: string,
    selectedPartialOffers: string[]
  ) => Promise<OfferRequest>
  getAirlineLogosByAirlineId: (
    airlineIds: string[]
  ) => Promise<Record<string, string>>
  getOfferPricingMap?: (offers: Offer[]) => Promise<
    Record<
      string,
      {
        offerId: string
        currency: string
        netAmount: number
        sellAmount: number
        appliedRuleId: string | null
        appliedRuleSpecificity: number | null
      }
    >
  >
  listOffers: (params: {
    offer_request_id: string
    after?: string
    limit: number
    sort: "total_amount" | "total_duration"
    max_connections: number
  }) => Promise<{ data: Offer[]; meta?: { after?: string | null } }>
}

export async function fetchFareOptionsData(
  input: {
    partialOfferRequestId: string
    state: ResultsUrlState
  },
  deps: FetchFareOptionsDeps = defaultFetchFareOptionsDeps
): Promise<FareOptionsPageData> {
  logFlightFlow("fetchFareOptionsData", "start", {
    partialOfferRequestId: input.partialOfferRequestId,
    requestedLeg: input.state.leg,
    selectedCount: input.state.selected.length,
    sort: input.state.sort,
    stops: input.state.stops,
    after: input.state.after,
  })
  const selectedFromUrl = normalizeSelectedOfferIds(input.state.selected)
  const baseOfferRequest = await deps.getBaseOfferRequest(input.partialOfferRequestId)
  const totalLegs = Math.max(baseOfferRequest.slices.length, 1)
  const leg = Math.min(Math.max(input.state.leg, 0), totalLegs - 1)
  const requiredSelectedCount = leg

  logFlightFlow("fetchFareOptionsData", "base_offer_request_loaded", {
    partialOfferRequestId: input.partialOfferRequestId,
    totalLegs,
    requestedLeg: input.state.leg,
    clampedLeg: leg,
    selectedFromUrlCount: selectedFromUrl.length,
  })

  if (new Set(selectedFromUrl).size !== selectedFromUrl.length) {
    logFlightFlow("fetchFareOptionsData", "invalid_selection_duplicate_ids", {
      partialOfferRequestId: input.partialOfferRequestId,
      selectedFromUrlCount: selectedFromUrl.length,
    })
    throw new Error(INVALID_SELECTION_STATE_MESSAGE)
  }

  if (selectedFromUrl.length < requiredSelectedCount) {
    logFlightFlow("fetchFareOptionsData", "invalid_selection_too_few", {
      partialOfferRequestId: input.partialOfferRequestId,
      selectedFromUrlCount: selectedFromUrl.length,
      requiredSelectedCount,
    })
    throw new Error(INVALID_SELECTION_STATE_MESSAGE)
  }

  if (selectedFromUrl.length > totalLegs - 1) {
    logFlightFlow("fetchFareOptionsData", "invalid_selection_too_many", {
      partialOfferRequestId: input.partialOfferRequestId,
      selectedFromUrlCount: selectedFromUrl.length,
      maxAllowed: totalLegs - 1,
    })
    throw new Error(INVALID_SELECTION_STATE_MESSAGE)
  }

  const selectedForLeg = selectedFromUrl.slice(0, requiredSelectedCount)
  logFlightFlow("fetchFareOptionsData", "selected_for_leg_computed", {
    partialOfferRequestId: input.partialOfferRequestId,
    requiredSelectedCount,
    selectedForLegCount: selectedForLeg.length,
  })

  const offerRequest = selectedForLeg.length
    ? await deps.getOfferRequestBySelected(input.partialOfferRequestId, selectedForLeg)
    : baseOfferRequest
  const safeState: ResultsUrlState = {
    ...input.state,
    leg,
    selected: selectedForLeg,
  }
  logFlightFlow("fetchFareOptionsData", "safe_state_built", {
    partialOfferRequestId: input.partialOfferRequestId,
    leg: safeState.leg,
    selectedCount: safeState.selected.length,
    sort: safeState.sort,
    stops: safeState.stops,
  })

  const offerRequestId = getOfferRequestIdFromOfferRequest(offerRequest)
  const fallbackResponse = {
    data: offerRequest.offers as unknown as Offer[],
    meta: {
      after: null,
    },
  }
  const listResponse = offerRequestId
    ? await deps.listOffers({
        offer_request_id: offerRequestId,
        ...(input.state.after ? { after: input.state.after } : {}),
        limit: duffelConfig.resultsPageSize,
        sort: toDuffelListOffersSort(input.state.sort),
        max_connections: toDuffelMaxConnections(input.state.stops),
      })
    : fallbackResponse

  logFlightFlow("fetchFareOptionsData", "offers_list_loaded", {
    partialOfferRequestId: input.partialOfferRequestId,
    offerRequestId,
    usedFallbackOffers: !offerRequestId,
    upstreamOfferCount: listResponse.data.length,
    nextAfter: listResponse.meta?.after ?? null,
  })

  const airlineIds = getAirlineIdsFromOffers(listResponse.data)
  const airlineLogosByAirlineId = await deps.getAirlineLogosByAirlineId(
    airlineIds
  )
  const offerPricingByOfferId = await (deps.getOfferPricingMap ?? getOfferPricingMapFromService)(
    listResponse.data
  )
  const pricingSummary = summarizeOfferPricing(offerPricingByOfferId)
  logFlightFlow("fetchFareOptionsData", "airline_logos_resolved", {
    partialOfferRequestId: input.partialOfferRequestId,
    airlineIdsCount: airlineIds.length,
    logoCount: Object.keys(airlineLogosByAirlineId).length,
  })
  logFlightFlow("fetchFareOptionsData", "offer_pricing_resolved", {
    partialOfferRequestId: input.partialOfferRequestId,
    ...pricingSummary,
  })

  const normalizedOffers = listResponse.data
    .map((offer) => normalizeOfferForLeg(offer, leg, airlineLogosByAirlineId))
    .filter((offer): offer is NonNullable<typeof offer> => offer !== null)
    .map((offer) => applyPricingToOfferCard(offer, offerPricingByOfferId[offer.id]))
  const filteredOffers = applyOfferClientFilters(normalizedOffers, safeState)
  const sortedOffers = applyOfferClientSorting(filteredOffers, safeState.sort)
  const airlines = Array.from(new Set(normalizedOffers.map((offer) => offer.ownerName))).sort(
    (left, right) => left.localeCompare(right)
  )

  logFlightFlow("fetchFareOptionsData", "offers_processed", {
    partialOfferRequestId: input.partialOfferRequestId,
    normalizedCount: normalizedOffers.length,
    filteredCount: filteredOffers.length,
    sortedCount: sortedOffers.length,
    airlinesCount: airlines.length,
  })

  const response = {
    partialOfferRequestId: input.partialOfferRequestId,
    leg,
    totalLegs,
    selected: selectedForLeg,
    breadcrumbs: createLegBreadcrumbs(offerRequest),
    searchSummary: createSearchSummary(offerRequest, leg),
    offers: sortedOffers,
    airlines,
    after: listResponse.meta?.after ?? null,
    state: safeState,
  }

  logFlightFlow("fetchFareOptionsData", "completed", {
    partialOfferRequestId: response.partialOfferRequestId,
    leg: response.leg,
    totalLegs: response.totalLegs,
    offerCount: response.offers.length,
    after: response.after,
  })

  return response
}

const defaultFetchFareOptionsDeps: FetchFareOptionsDeps = {
  async getBaseOfferRequest(partialOfferRequestId) {
    try {
      logFlightFlow("fetchFareOptionsData.getBaseOfferRequest", "request_started", {
        partialOfferRequestId,
      })
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.partialOfferRequests.get(partialOfferRequestId)
      logFlightFlow("fetchFareOptionsData.getBaseOfferRequest", "request_succeeded", {
        partialOfferRequestId,
        offerCount: response.data.offers.length,
        sliceCount: response.data.slices.length,
      })
      return response.data as OfferRequest
    } catch (error) {
      logFlightFlowError(
        "fetchFareOptionsData.getBaseOfferRequest",
        "request_failed",
        error,
        { partialOfferRequestId }
      )
      logDuffelError("partialOfferRequests.get failed", error, {
        partialOfferRequestId,
      })
      throw new Error(
        mapDuffelErrorMessage(error, "Could not load fare options at the moment.")
      )
    }
  },
  async getOfferRequestBySelected(partialOfferRequestId, selectedPartialOffers) {
    try {
      logFlightFlow(
        "fetchFareOptionsData.getOfferRequestBySelected",
        "request_started",
        {
          partialOfferRequestId,
          selectedCount: selectedPartialOffers.length,
        }
      )
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.partialOfferRequests.get(
        partialOfferRequestId,
        {
          "selected_partial_offer[]": selectedPartialOffers,
        }
      )

      logFlightFlow(
        "fetchFareOptionsData.getOfferRequestBySelected",
        "request_succeeded",
        {
          partialOfferRequestId,
          selectedCount: selectedPartialOffers.length,
          offerCount: response.data.offers.length,
          sliceCount: response.data.slices.length,
        }
      )
      return response.data as OfferRequest
    } catch (error) {
      logFlightFlowError(
        "fetchFareOptionsData.getOfferRequestBySelected",
        "request_failed",
        error,
        {
          partialOfferRequestId,
          selectedCount: selectedPartialOffers.length,
        }
      )
      logDuffelError("partialOfferRequests.get with selected offers failed", error, {
        partialOfferRequestId,
        selectedPartialOffers,
      })
      throw new Error(
        mapDuffelErrorMessage(error, "Could not load fare options at the moment.")
      )
    }
  },
  async getAirlineLogosByAirlineId(airlineIds) {
    return getAirlineLogosByAirlineId(airlineIds)
  },
  async listOffers(params) {
    try {
      logFlightFlow("fetchFareOptionsData.listOffers", "request_started", {
        offerRequestId: params.offer_request_id,
        after: params.after,
        limit: params.limit,
        sort: params.sort,
        maxConnections: params.max_connections,
      })
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.offers.list(params)

      logFlightFlow("fetchFareOptionsData.listOffers", "request_succeeded", {
        offerRequestId: params.offer_request_id,
        offerCount: response.data.length,
        nextAfter: response.meta?.after ?? null,
      })

      return response as { data: Offer[]; meta?: { after?: string | null } }
    } catch (error) {
      logFlightFlowError("fetchFareOptionsData.listOffers", "request_failed", error, {
        offerRequestId: params.offer_request_id,
        after: params.after,
        limit: params.limit,
        sort: params.sort,
        maxConnections: params.max_connections,
      })
      logDuffelError("offers.list failed", error, {
        offerRequestId: params.offer_request_id,
        after: params.after,
        limit: params.limit,
        sort: params.sort,
        maxConnections: params.max_connections,
      })
      throw new Error(
        mapDuffelErrorMessage(error, "Could not list offers for this search.")
      )
    }
  },
}

function normalizeSelectedOfferIds(selected: string[]) {
  return selected
    .map((offerId) => offerId.trim())
    .filter((offerId) => offerId.length > 0)
}

function applyPricingToOfferCard(
  offer: NonNullable<ReturnType<typeof normalizeOfferForLeg>>,
  pricing: { sellAmount: number; currency: string } | undefined
) {
  if (!pricing) {
    return offer
  }

  return {
    ...offer,
    totalAmountValue: pricing.sellAmount,
    totalCurrency: pricing.currency,
    totalAmountLabel: formatCurrencyAmount(pricing.sellAmount, pricing.currency),
  }
}

function getOfferRequestIdFromOfferRequest(offerRequest: OfferRequest): string | null {
  const firstOffer = offerRequest.offers[0] as
    | (Offer & { offer_request_id?: string })
    | undefined

  if (!firstOffer?.offer_request_id) {
    return null
  }

  return firstOffer.offer_request_id
}
