import {
  MAX_MULTI_CITY_SLICES,
  MIN_MULTI_CITY_SLICES,
} from "@/modules/flights/search/domain/constants"
import type {
  FlightSearchFormValues,
  FlightSliceInput,
  JourneyType,
} from "@/modules/flights/search/domain/types"

export const DEFAULT_CABIN_CLASS = "economy"

export function createEmptySlice(): FlightSliceInput {
  return {
    origin: null,
    destination: null,
    departureDate: "",
    departureTime: null,
    arrivalTime: null,
  }
}

export function createDefaultFlightSearchValues(): FlightSearchFormValues {
  return {
    journeyType: "one_way",
    slices: [createEmptySlice()],
    passengers: {
      adults: 1,
      children: 0,
    },
    cabinClass: DEFAULT_CABIN_CLASS,
  }
}

export function ensureSlicesForJourneyType(
  journeyType: JourneyType,
  slices: FlightSliceInput[]
): FlightSliceInput[] {
  const safeSlices = slices.length > 0 ? slices.map(cloneSlice) : [createEmptySlice()]

  if (journeyType === "one_way") {
    return [safeSlices[0] ?? createEmptySlice()]
  }

  if (journeyType === "return") {
    return [
      safeSlices[0] ?? createEmptySlice(),
      safeSlices[1] ?? createEmptySlice(),
    ]
  }

  const clamped = safeSlices.slice(0, MAX_MULTI_CITY_SLICES)

  while (clamped.length < MIN_MULTI_CITY_SLICES) {
    clamped.push(createEmptySlice())
  }

  return clamped
}

function cloneSlice(slice: FlightSliceInput): FlightSliceInput {
  return {
    origin: slice.origin,
    destination: slice.destination,
    departureDate: slice.departureDate,
    departureTime: slice.departureTime
      ? {
          ...slice.departureTime,
        }
      : null,
    arrivalTime: slice.arrivalTime
      ? {
          ...slice.arrivalTime,
        }
      : null,
  }
}
