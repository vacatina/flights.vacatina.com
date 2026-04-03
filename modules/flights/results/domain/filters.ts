import type {
  OfferCardViewModel,
  ResultsUrlState,
} from "@/modules/flights/results/domain/types"

export function applyOfferClientFilters(
  offers: OfferCardViewModel[],
  state: ResultsUrlState
) {
  const airlineFilter = state.airline?.trim().toLowerCase()
  const flightFilter = state.flightNumber?.trim().toLowerCase()

  return offers.filter((offer) => {
    if (airlineFilter && !offer.filterTokens.airline.includes(airlineFilter)) {
      return false
    }

    if (flightFilter && !offer.filterTokens.flightNumbers.includes(flightFilter)) {
      return false
    }

    if (
      offer.takeoffMinutes < state.takeoffFrom ||
      offer.takeoffMinutes > state.takeoffTo
    ) {
      return false
    }

    if (
      offer.landingMinutes < state.landingFrom ||
      offer.landingMinutes > state.landingTo
    ) {
      return false
    }

    return true
  })
}

export function applyOfferClientSorting(
  offers: OfferCardViewModel[],
  sort: ResultsUrlState["sort"]
) {
  const next = [...offers]

  if (sort === "least_expensive") {
    return next.sort((left, right) => left.totalAmountValue - right.totalAmountValue)
  }

  if (sort === "most_expensive") {
    return next.sort((left, right) => right.totalAmountValue - left.totalAmountValue)
  }

  if (sort === "shortest_duration") {
    return next.sort((left, right) => left.durationMinutes - right.durationMinutes)
  }

  return next.sort((left, right) => right.durationMinutes - left.durationMinutes)
}

export function toDuffelListOffersSort(sort: ResultsUrlState["sort"]) {
  if (sort === "least_expensive" || sort === "most_expensive") {
    return "total_amount" as const
  }

  return "total_duration" as const
}

export function toDuffelMaxConnections(stops: ResultsUrlState["stops"]) {
  if (stops === "direct") {
    return 0
  }

  if (stops === "max_1") {
    return 1
  }

  return 2
}
