import { test } from "node:test"
import assert from "node:assert/strict"

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

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.code, "VALIDATION_ERROR")
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

  assert.deepEqual(result, {
    ok: true,
    data: options,
  })
})

test("executeSubmitFlightSearchAction returns request id and logs payload", async () => {
  let loggedRequestId: string | null = null

  const result = await executeSubmitFlightSearchAction(buildValidInput(), {
    createRequestId: () => "req_test_123",
    logFlightSearchRequest: (requestId) => {
      loggedRequestId = requestId
    },
  })

  assert.deepEqual(result, {
    ok: true,
    data: {
      requestId: "req_test_123",
    },
  })

  assert.equal(loggedRequestId, "req_test_123")
})
