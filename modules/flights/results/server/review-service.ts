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
import {
  logFlightFlow,
  logFlightFlowError,
} from "@/modules/flights/shared/flow-debug"

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
  logFlightFlow("fetchReviewPageData", "start", {
    partialOfferRequestId: input.partialOfferRequestId,
    selectedCount: input.state.selected.length,
    fareCount: input.state.fare.length,
  })
  const selectedPartialOffers = normalizeSelectedOfferIds(input.state.selected)
  logFlightFlow("fetchReviewPageData", "selected_normalized", {
    partialOfferRequestId: input.partialOfferRequestId,
    selectedCount: selectedPartialOffers.length,
  })

  if (new Set(selectedPartialOffers).size !== selectedPartialOffers.length) {
    logFlightFlow("fetchReviewPageData", "invalid_state_duplicate_selected", {
      partialOfferRequestId: input.partialOfferRequestId,
      selectedCount: selectedPartialOffers.length,
    })
    throw new Error(INVALID_REVIEW_STATE_MESSAGE)
  }

  const baseOfferRequest = await deps.getBaseOfferRequest(input.partialOfferRequestId)
  const totalLegs = Math.max(baseOfferRequest.slices.length, 1)
  logFlightFlow("fetchReviewPageData", "base_offer_request_loaded", {
    partialOfferRequestId: input.partialOfferRequestId,
    totalLegs,
    selectedCount: selectedPartialOffers.length,
  })

  if (selectedPartialOffers.length !== totalLegs) {
    logFlightFlow("fetchReviewPageData", "invalid_state_selected_count_mismatch", {
      partialOfferRequestId: input.partialOfferRequestId,
      selectedCount: selectedPartialOffers.length,
      requiredSelectedCount: totalLegs,
    })
    throw new Error(INVALID_REVIEW_STATE_MESSAGE)
  }

  const reviewOfferRequest = await deps.getFaresBySelected(
    input.partialOfferRequestId,
    selectedPartialOffers
  )
  logFlightFlow("fetchReviewPageData", "review_offer_request_loaded", {
    partialOfferRequestId: input.partialOfferRequestId,
    fareOfferCount: reviewOfferRequest.offers.length,
    sliceCount: reviewOfferRequest.slices.length,
  })

  const fares = reviewOfferRequest.offers as Offer[]

  if (fares.length === 0) {
    logFlightFlow("fetchReviewPageData", "empty_fares", {
      partialOfferRequestId: input.partialOfferRequestId,
    })
    throw new Error("No fare options are available for this selection.")
  }

  const airlineIds = getAirlineIdsFromOffers(fares)
  const airlineLogosByAirlineId = await deps.getAirlineLogosByAirlineId(
    airlineIds
  )
  logFlightFlow("fetchReviewPageData", "airline_logos_resolved", {
    partialOfferRequestId: input.partialOfferRequestId,
    airlineIdsCount: airlineIds.length,
    logoCount: Object.keys(airlineLogosByAirlineId).length,
  })

  const reviewModel = buildReviewPageModel({
    offerRequest: reviewOfferRequest,
    selected: selectedPartialOffers,
    requestedFare: input.state.fare,
    airlineLogosByAirlineId,
  })
  logFlightFlow("fetchReviewPageData", "review_model_built", {
    partialOfferRequestId: input.partialOfferRequestId,
    totalLegs: reviewModel.totalLegs,
    normalizedFareCount: reviewModel.state.fare.length,
    summaryCheckoutEnabled: reviewModel.summary.checkoutEnabled,
    summaryFinalOfferId: reviewModel.summary.finalOfferId,
  })

  const response = {
    partialOfferRequestId: input.partialOfferRequestId,
    ...reviewModel,
  }

  logFlightFlow("fetchReviewPageData", "completed", {
    partialOfferRequestId: response.partialOfferRequestId,
    totalLegs: response.totalLegs,
    selectedCount: response.state.selected.length,
    fareCount: response.state.fare.length,
  })

  return response
}

const defaultFetchReviewPageDeps: FetchReviewPageDeps = {
  async getBaseOfferRequest(partialOfferRequestId) {
    try {
      logFlightFlow("fetchReviewPageData.getBaseOfferRequest", "request_started", {
        partialOfferRequestId,
      })
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.partialOfferRequests.get(partialOfferRequestId)

      logFlightFlow("fetchReviewPageData.getBaseOfferRequest", "request_succeeded", {
        partialOfferRequestId,
        sliceCount: response.data.slices.length,
        offerCount: response.data.offers.length,
      })
      return response.data as OfferRequest
    } catch (error) {
      logFlightFlowError(
        "fetchReviewPageData.getBaseOfferRequest",
        "request_failed",
        error,
        {
          partialOfferRequestId,
        }
      )
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
      logFlightFlow(
        "fetchReviewPageData.getFaresBySelected",
        "request_started",
        {
          partialOfferRequestId,
          selectedCount: selectedPartialOffers.length,
        }
      )
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.partialOfferRequests.getFaresById(
        partialOfferRequestId,
        {
          "selected_partial_offer[]": selectedPartialOffers,
        }
      )

      logFlightFlow(
        "fetchReviewPageData.getFaresBySelected",
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
        "fetchReviewPageData.getFaresBySelected",
        "request_failed",
        error,
        {
          partialOfferRequestId,
          selectedCount: selectedPartialOffers.length,
        }
      )
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
