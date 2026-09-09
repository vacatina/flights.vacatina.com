import { addDays, format } from "date-fns"

import { createDefaultFlightSearchValues } from "@/modules/flights/search/domain/defaults"
import { createSearchPrefillToken } from "@/modules/flights/search/domain/prefill"
import type { PlaceSuggestionOption } from "@/modules/flights/search/domain/types"

export const destinations = [
  {
    code: "DXB",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    airport: "Dubai International Airport",
    image: "/img/destinations/dubai.webp",
    description: "Skyline views. Desert adventures.",
    alt: "Dubai skyline reflected in the water",
  },
  {
    code: "LHR",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    airport: "Heathrow Airport",
    image: "/img/destinations/london.webp",
    description: "A new story around every corner.",
    alt: "Tower Bridge spanning the Thames in London",
  },
  {
    code: "SIN",
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    airport: "Singapore Changi Airport",
    image: "/img/destinations/singapore.webp",
    description: "City lights meet garden walks.",
    alt: "Singapore skyline across Marina Bay",
  },
  {
    code: "BKK",
    city: "Bangkok",
    country: "Thailand",
    countryCode: "TH",
    airport: "Suvarnabhumi Airport",
    image: "/img/destinations/bangkok.webp",
    description: "Temples, markets, and more.",
    alt: "Wat Arun temple beside the river in Bangkok",
  },
] as const

export type Destination = (typeof destinations)[number]

function place(
  code: string,
  city: string,
  country: string,
  countryCode: string,
  airport: string
): PlaceSuggestionOption {
  return {
    id: `airport_${code.toLowerCase()}`,
    type: "airport",
    iataCode: code,
    iataCityCode: null,
    name: airport,
    cityName: city,
    countryCode,
    countryName: country,
    displayName: `${city} (${code})`,
  }
}

/** Build a new search, never reuse another traveller's dates or passenger details. */
export function destinationSearchHref(
  destination: Destination,
  now = new Date()
) {
  const values = createDefaultFlightSearchValues()
  values.slices[0] = {
    ...values.slices[0],
    origin: place(
      "CMB",
      "Colombo",
      "Sri Lanka",
      "LK",
      "Bandaranaike International Airport"
    ),
    destination: place(
      destination.code,
      destination.city,
      destination.country,
      destination.countryCode,
      destination.airport
    ),
    departureDate: format(addDays(now, 30), "yyyy-MM-dd"),
  }
  const token = createSearchPrefillToken(values)
  return token
    ? `/?prefill=${encodeURIComponent(token)}#flight-search`
    : "/#flight-search"
}
