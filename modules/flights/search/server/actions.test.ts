import { expect, test } from "vitest"

import {
  executeSearchPlacesAction,
  executeSubmitFlightSearchAction,
} from "@/modules/flights/search/server/actions"
import type {
  FlightSearchFormValues,
  PlaceSuggestionOption,
} from "@/modules/flights/search/domain"

function place(code: string, name: string): PlaceSuggestionOption {
  return {
    id: `arp_${code.toLowerCase()}`,
    type: "airport",
    iataCode: code,
    iataCityCode: code,
    name,
    cityName: name,
    countryCode: "LK",
    countryName: "Sri Lanka",
    displayName: `${name} (${code})`,
  }
}

function buildValidInput(): FlightSearchFormValues {
  return {
    journeyType: "one_way",
    cabinClass: "economy",
    passengers: {
      adults: 1,
      children: 0,
      childrenAges: [],
    },
    slices: [
      {
        origin: place("CMB", "Colombo"),
        destination: place("DXB", "Dubai"),
        departureDate: "2026-11-08",
        departureTime: null,
        arrivalTime: null,
      },
    ],
  }
}

test("executeSearchPlacesAction returns validation error contract", async () => {
  const result = await executeSearchPlacesAction(
    { query: "x" },
    {
      searchPlaces: async () => [],
      logError: () => undefined,
    }
  )

  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(result.error.code).toBe("VALIDATION_ERROR")
  }
})

test("executeSubmitFlightSearchAction returns field-level errors for invalid payload", async () => {
  const invalidInput = buildValidInput()
  invalidInput.slices[0].origin = null

  const result = await executeSubmitFlightSearchAction(invalidInput, {
    createPartialOfferRequest: async () => ({
      partialOfferRequestId: "por_test_invalid",
    }),
    logError: () => undefined,
  })

  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(result.error.code).toBe("VALIDATION_ERROR")
    expect(result.error.fieldErrors?.["slices.0.origin"]).toBe(
      "Flight 1: origin is required."
    )
  }
})

test("executeSearchPlacesAction returns success contract", async () => {
  const options: PlaceSuggestionOption[] = [place("CMB", "Colombo")]

  const result = await executeSearchPlacesAction(
    { query: "colombo" },
    {
      searchPlaces: async () => options,
      logError: () => undefined,
    }
  )

  expect(result).toEqual({
    ok: true,
    data: options,
  })
})

test("executeSubmitFlightSearchAction returns partial offer request id", async () => {
  const result = await executeSubmitFlightSearchAction(buildValidInput(), {
    createPartialOfferRequest: async () => ({
      partialOfferRequestId: "por_test_123",
    }),
    logError: () => undefined,
  })

  expect(result).toEqual({
    ok: true,
    data: {
      partialOfferRequestId: "por_test_123",
    },
  })
})

test("executeSubmitFlightSearchAction blocks multi-city for now", async () => {
  const input = buildValidInput()
  input.journeyType = "multi_city"
  input.slices.push({
    origin: place("DXB", "Dubai"),
    destination: place("CMB", "Colombo"),
    departureDate: "2026-11-10",
    departureTime: null,
    arrivalTime: null,
  })

  const result = await executeSubmitFlightSearchAction(input, {
    createPartialOfferRequest: async () => ({
      partialOfferRequestId: "por_test_123",
    }),
    logError: () => undefined,
  })

  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(result.error.fieldErrors?.journeyType).toBe(
      "Multi-city search is temporarily unavailable."
    )
  }
})
