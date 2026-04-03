import type { Airline, Offer, OfferRequest } from "@duffel/api/types"

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

const PAGE_SIZE = 20

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
  const selectedFromUrl = input.state.selected.filter(Boolean)
  const selectedForLeg = selectedFromUrl.slice(0, Math.max(input.state.leg, 0))

  const offerRequest = selectedForLeg.length
    ? await deps.getOfferRequestBySelected(input.partialOfferRequestId, selectedForLeg)
    : await deps.getBaseOfferRequest(input.partialOfferRequestId)
  const totalLegs = Math.max(offerRequest.slices.length, 1)
  const leg = Math.min(Math.max(input.state.leg, 0), totalLegs - 1)
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
        limit: PAGE_SIZE,
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
    const result: Record<string, string> = {}
    const idsToFetch = airlineIds.filter((id) => !airlineLogoCache.has(id))

    if (idsToFetch.length > 0) {
      try {
        const { getDuffelClient } = await import("@/lib/duffel")
        const client = getDuffelClient()
        const responses = await Promise.allSettled(
          idsToFetch.map((airlineId) => client.airlines.get(airlineId))
        )

        for (let index = 0; index < responses.length; index += 1) {
          const airlineId = idsToFetch[index]
          const response = responses[index]

          if (response.status === "fulfilled") {
            const airline = response.value.data as Airline
            const logoUrl = airline.logo_symbol_url ?? airline.logo_lockup_url ?? null
            airlineLogoCache.set(airlineId, logoUrl)
            continue
          }

          airlineLogoCache.set(airlineId, null)
          logDuffelError("airlines.get failed", response.reason, { airlineId })
        }
      } catch (error) {
        logDuffelError("airlines.get batch failed", error, {
          airlineIds: idsToFetch,
        })
      }
    }

    for (const airlineId of airlineIds) {
      const logoUrl = airlineLogoCache.get(airlineId)

      if (logoUrl) {
        result[airlineId] = logoUrl
      }
    }

    return result
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

const airlineLogoCache = new Map<string, string | null>()

function getAirlineIdsFromOffers(offers: Offer[]) {
  return Array.from(
    new Set(
      offers
        .map((offer) => offer.owner.id)
        .filter((airlineId): airlineId is string => Boolean(airlineId))
    )
  )
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
