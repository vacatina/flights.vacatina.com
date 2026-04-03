import type { CabinClass as DuffelCabinClass } from "@duffel/api/types"

import { CABIN_CLASSES, JOURNEY_TYPES } from "@/modules/flights/search/domain/constants"

export type JourneyType = (typeof JOURNEY_TYPES)[number]
export type PlaceType = "airport" | "city"

export type CabinClass = Extract<
  DuffelCabinClass,
  (typeof CABIN_CLASSES)[number]
>

export interface PlaceSuggestionOption {
  id: string
  type: PlaceType
  iataCode: string
  iataCityCode: string | null
  name: string
  cityName: string | null
  countryCode: string
  countryName: string | null
  displayName: string
}

export interface TimeRangeInput {
  from: string
  to: string
}

export interface FlightSliceInput {
  origin: PlaceSuggestionOption | null
  destination: PlaceSuggestionOption | null
  departureDate: string
  departureTime: TimeRangeInput | null
  arrivalTime: TimeRangeInput | null
}

export interface PassengerInput {
  adults: number
  children: number
  childrenAges: number[]
}

export interface FlightSearchFormValues {
  journeyType: JourneyType
  slices: FlightSliceInput[]
  passengers: PassengerInput
  cabinClass: CabinClass
}

export interface FlightSearchCommandSlice {
  originIataCode: string
  destinationIataCode: string
  departureDate: string
  departureTime: TimeRangeInput | null
  arrivalTime: TimeRangeInput | null
}

export interface FlightSearchCommand {
  journeyType: JourneyType
  cabinClass: CabinClass
  passengers: PassengerInput
  slices: FlightSearchCommandSlice[]
}
