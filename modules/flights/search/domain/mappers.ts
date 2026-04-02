import type {
  CabinClass,
  FlightSearchCommand,
  FlightSearchFormValues,
  PassengerInput,
  PlaceSuggestionOption,
} from "@/modules/flights/search/domain/types"

export const CABIN_CLASS_LABELS: Record<CabinClass, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
}

export const JOURNEY_TYPE_LABELS = {
  one_way: "One way",
  return: "Return",
  multi_city: "Multi-city",
} as const

export function toFlightSearchCommand(values: FlightSearchFormValues): FlightSearchCommand {
  return {
    journeyType: values.journeyType,
    cabinClass: values.cabinClass,
    passengers: values.passengers,
    slices: values.slices.map((slice) => ({
      originIataCode: slice.origin?.iataCode ?? "",
      destinationIataCode: slice.destination?.iataCode ?? "",
      departureDate: slice.departureDate,
      departureTime: slice.departureTime,
      arrivalTime: slice.arrivalTime,
    })),
  }
}

export function formatPlaceDisplayName(option: PlaceSuggestionOption): string {
  if (option.type === "city") {
    return `${option.name} (${option.iataCode})`
  }

  const city = option.cityName ? `${option.cityName} - ` : ""
  return `${city}${option.name} (${option.iataCode})`
}

export function formatPassengerSummary(passengers: PassengerInput): string {
  const parts: string[] = []

  if (passengers.adults > 0) {
    parts.push(`${passengers.adults} adult${passengers.adults > 1 ? "s" : ""}`)
  }

  if (passengers.children > 0) {
    parts.push(
      `${passengers.children} child${passengers.children > 1 ? "ren" : ""}`
    )
  }

  return parts.join(", ")
}
