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
  const selectedFromUrl = normalizeSelectedOfferIds(input.state.selected)
  const baseOfferRequest = await deps.getBaseOfferRequest(input.partialOfferRequestId)
  const totalLegs = Math.max(baseOfferRequest.slices.length, 1)
  const leg = Math.min(Math.max(input.state.leg, 0), totalLegs - 1)
  const requiredSelectedCount = leg

  if (new Set(selectedFromUrl).size !== selectedFromUrl.length) {
    throw new Error(INVALID_SELECTION_STATE_MESSAGE)
  }

  if (selectedFromUrl.length < requiredSelectedCount) {
    throw new Error(INVALID_SELECTION_STATE_MESSAGE)
  }

  if (selectedFromUrl.length > totalLegs - 1) {
    throw new Error(INVALID_SELECTION_STATE_MESSAGE)
  }

  const selectedForLeg = selectedFromUrl.slice(0, requiredSelectedCount)
  const offerRequest = selectedForLeg.length
    ? await deps.getOfferRequestBySelected(input.partialOfferRequestId, selectedForLeg)
    : baseOfferRequest
  const safeState: ResultsUrlState = {
    ...input.state,
    leg,
    selected: selectedForLeg,
  }
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
  const airlineLogosByAirlineId = await deps.getAirlineLogosByAirlineId(
    getAirlineIdsFromOffers(listResponse.data)
  )
  const normalizedOffers = listResponse.data
    .map((offer) => normalizeOfferForLeg(offer, leg, airlineLogosByAirlineId))
    .filter((offer): offer is NonNullable<typeof offer> => offer !== null)
  const filteredOffers = applyOfferClientFilters(normalizedOffers, safeState)
  const sortedOffers = applyOfferClientSorting(filteredOffers, safeState.sort)
  const airlines = Array.from(new Set(normalizedOffers.map((offer) => offer.ownerName))).sort(
    (left, right) => left.localeCompare(right)
  )

  return {
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
}

const defaultFetchFareOptionsDeps: FetchFareOptionsDeps = {
  async getBaseOfferRequest(partialOfferRequestId) {
    try {
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.partialOfferRequests.get(partialOfferRequestId)
      return response.data as OfferRequest
    } catch (error) {
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
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.partialOfferRequests.get(
        partialOfferRequestId,
        {
          "selected_partial_offer[]": selectedPartialOffers,
        }
      )

      return response.data as OfferRequest
    } catch (error) {
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
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.offers.list(params)

      return response as { data: Offer[]; meta?: { after?: string | null } }
    } catch (error) {
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

function getOfferRequestIdFromOfferRequest(offerRequest: OfferRequest): string | null {
  const firstOffer = offerRequest.offers[0] as
    | (Offer & { offer_request_id?: string })
    | undefined

  if (!firstOffer?.offer_request_id) {
    return null
  }

  return firstOffer.offer_request_id
}
