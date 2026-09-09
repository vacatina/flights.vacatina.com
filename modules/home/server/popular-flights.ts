import "server-only"

import { addDays, format } from "date-fns"
import { unstable_cache } from "next/cache"

import { getDuffelClient, getDuffelFlightConfig } from "@/lib/duffel"
import type {
  OfferCardViewModel,
  ResultsUrlState,
} from "@/modules/flights/results/domain"
import { fetchFareOptionsData } from "@/modules/flights/results/server/service"

const POPULAR_ROUTE = {
  origin: "CMB",
  originCity: "Colombo",
  destination: "DXB",
  destinationCity: "Dubai",
} as const

export interface PopularFlightOffers {
  departureDateLabel: string
  fareOptionsHref: string
  offers: OfferCardViewModel[]
  originCity: string
  destinationCity: string
  partialOfferRequestId: string
}

const readPopularFlightOffers = unstable_cache(
  async (): Promise<PopularFlightOffers> => {
    const departureDate = addDays(new Date(), 30)
    const departureDateIso = format(departureDate, "yyyy-MM-dd")
    const client = getDuffelClient()
    const config = getDuffelFlightConfig()
    const response = await client.partialOfferRequests.create({
      cabin_class: "economy",
      max_connections: config.partialOfferCreateMaxConnections,
      supplier_timeout: config.partialOfferCreateSupplierTimeoutMs,
      passengers: [{ type: "adult" }],
      slices: [
        {
          origin: POPULAR_ROUTE.origin,
          destination: POPULAR_ROUTE.destination,
          departure_date: departureDateIso,
          departure_time: null,
          arrival_time: null,
        },
      ],
    })
    const partialOfferRequestId = response.data.id
    const state: ResultsUrlState = {
      leg: 0,
      selected: [],
      sort: "least_expensive",
      stops: "any",
      takeoffFrom: 0,
      takeoffTo: 1439,
      landingFrom: 0,
      landingTo: 1439,
    }
    const results = await fetchFareOptionsData({
      partialOfferRequestId,
      state,
    })

    return {
      departureDateLabel: format(departureDate, "EEE, d MMM"),
      fareOptionsHref: `/results/${partialOfferRequestId}/fare-options`,
      offers: chooseFeaturedOffers(results.offers),
      originCity: POPULAR_ROUTE.originCity,
      destinationCity: POPULAR_ROUTE.destinationCity,
      partialOfferRequestId,
    }
  },
  ["homepage-popular-flight-offers-v2"],
  { revalidate: 180 }
)

/**
 * Return current supplier offers, never invented schedules or remembered prices.
 * The short cache keeps homepage traffic reasonable while staying within the
 * normal lifetime of a Duffel offer.
 */
export async function getPopularFlightOffers() {
  try {
    const result = await readPopularFlightOffers()
    return result.offers.length > 0 ? result : null
  } catch (error) {
    console.warn(
      "[home/popular-flights] Live offers unavailable; showing search fallback.",
      error
    )
    return null
  }
}

function chooseFeaturedOffers(offers: OfferCardViewModel[]) {
  const activeOffers = offers.filter((offer) => !offer.isExpired)
  const featured: OfferCardViewModel[] = []
  const featuredAirlines = new Set<string>()

  for (const offer of activeOffers) {
    if (featuredAirlines.has(offer.ownerCode)) {
      continue
    }

    featured.push(offer)
    featuredAirlines.add(offer.ownerCode)

    if (featured.length === 4) {
      return featured
    }
  }

  for (const offer of activeOffers) {
    if (featured.some((item) => item.id === offer.id)) {
      continue
    }

    featured.push(offer)

    if (featured.length === 4) {
      break
    }
  }

  return featured
}
