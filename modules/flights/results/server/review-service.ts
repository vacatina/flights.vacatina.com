import type { Offer, OfferRequest } from "@duffel/api/types"

import {
  buildReviewPageModel,
  type ReviewPageData,
  type ReviewUrlState,
} from "@/modules/flights/results/domain"
import {
  getAirlineIdsFromOffers,
  getAirlineLogosByAirlineId,
} from "@/modules/flights/results/server/airline-logos"
import {
  logDuffelError,
  mapDuffelErrorMessage,
} from "@/modules/flights/results/server/error-map"

const INVALID_REVIEW_STATE_MESSAGE =
  "Invalid fare selection state. Please return to fare options and reselect flights."

interface FetchReviewPageDeps {
  getBaseOfferRequest: (partialOfferRequestId: string) => Promise<OfferRequest>
  getFaresBySelected: (
    partialOfferRequestId: string,
    selectedPartialOffers: string[]
  ) => Promise<OfferRequest>
  getAirlineLogosByAirlineId: (
    airlineIds: string[]
  ) => Promise<Record<string, string>>
}

export async function fetchReviewPageData(
  input: {
    partialOfferRequestId: string
    state: ReviewUrlState
  },
  deps: FetchReviewPageDeps = defaultFetchReviewPageDeps
): Promise<ReviewPageData> {
  const selectedPartialOffers = normalizeSelectedOfferIds(input.state.selected)

  if (new Set(selectedPartialOffers).size !== selectedPartialOffers.length) {
    throw new Error(INVALID_REVIEW_STATE_MESSAGE)
  }

  const baseOfferRequest = await deps.getBaseOfferRequest(input.partialOfferRequestId)
  const totalLegs = Math.max(baseOfferRequest.slices.length, 1)

  if (selectedPartialOffers.length !== totalLegs) {
    throw new Error(INVALID_REVIEW_STATE_MESSAGE)
  }

  const reviewOfferRequest = await deps.getFaresBySelected(
    input.partialOfferRequestId,
    selectedPartialOffers
  )

  const fares = reviewOfferRequest.offers as Offer[]

  if (fares.length === 0) {
    throw new Error("No fare options are available for this selection.")
  }

  const airlineLogosByAirlineId = await deps.getAirlineLogosByAirlineId(
    getAirlineIdsFromOffers(fares)
  )

  const reviewModel = buildReviewPageModel({
    offerRequest: reviewOfferRequest,
    selected: selectedPartialOffers,
    requestedFare: input.state.fare,
    airlineLogosByAirlineId,
  })

  return {
    partialOfferRequestId: input.partialOfferRequestId,
    ...reviewModel,
  }
}

const defaultFetchReviewPageDeps: FetchReviewPageDeps = {
  async getBaseOfferRequest(partialOfferRequestId) {
    try {
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.partialOfferRequests.get(partialOfferRequestId)

      return response.data as OfferRequest
    } catch (error) {
      logDuffelError("review.partialOfferRequests.get failed", error, {
        partialOfferRequestId,
      })
      throw new Error(
        mapDuffelErrorMessage(error, "Could not load fare options at the moment.")
      )
    }
  },
  async getFaresBySelected(partialOfferRequestId, selectedPartialOffers) {
    try {
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.partialOfferRequests.getFaresById(
        partialOfferRequestId,
        {
          "selected_partial_offer[]": selectedPartialOffers,
        }
      )

      return response.data as OfferRequest
    } catch (error) {
      logDuffelError("review.partialOfferRequests.getFaresById failed", error, {
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
}

function normalizeSelectedOfferIds(selected: string[]) {
  return selected
    .map((offerId) => offerId.trim())
    .filter((offerId) => offerId.length > 0)
}
