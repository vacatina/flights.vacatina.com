import { test } from "node:test"
import assert from "node:assert/strict"

import {
  formatPassengerSummary,
  formatPlaceDisplayName,
  toFlightSearchCommand,
  type FlightSearchFormValues,
  type PlaceSuggestionOption,
} from "@/modules/flights/search/domain"

const colomboAirport: PlaceSuggestionOption = {
  id: "arp_cmb_lk",
  type: "airport",
  iataCode: "CMB",
  iataCityCode: "CMB",
  name: "Bandaranaike International",
  cityName: "Colombo",
  countryCode: "LK",
  countryName: "Sri Lanka",
  displayName: "Colombo - Bandaranaike International (CMB)",
}

const singaporeCity: PlaceSuggestionOption = {
  id: "cit_sin_sg",
  type: "city",
  iataCode: "SIN",
  iataCityCode: null,
  name: "Singapore",
  cityName: null,
  countryCode: "SG",
  countryName: "Singapore",
  displayName: "Singapore (SIN)",
}

test("formatPlaceDisplayName formats airport and city labels", () => {
  assert.equal(
    formatPlaceDisplayName(colomboAirport),
    "Colombo - Bandaranaike International (CMB)"
  )
  assert.equal(formatPlaceDisplayName(singaporeCity), "Singapore (SIN)")
})

test("formatPassengerSummary creates a readable summary", () => {
  assert.equal(formatPassengerSummary({ adults: 1, children: 0 }), "1 adult")
  assert.equal(
    formatPassengerSummary({ adults: 2, children: 2 }),
    "2 adults, 2 children"
  )
})

test("toFlightSearchCommand maps form values into command payload", () => {
  const values: FlightSearchFormValues = {
    journeyType: "one_way",
    cabinClass: "business",
    passengers: {
      adults: 2,
      children: 1,
    },
    slices: [
      {
        origin: colomboAirport,
        destination: singaporeCity,
        departureDate: "2026-12-24",
        departureTime: {
          from: "07:00",
          to: "12:00",
        },
        arrivalTime: null,
      },
    ],
  }

  const command = toFlightSearchCommand(values)

  assert.deepEqual(command, {
    journeyType: "one_way",
    cabinClass: "business",
    passengers: {
      adults: 2,
      children: 1,
    },
    slices: [
      {
        originIataCode: "CMB",
        destinationIataCode: "SIN",
        departureDate: "2026-12-24",
        departureTime: {
          from: "07:00",
          to: "12:00",
        },
        arrivalTime: null,
      },
    ],
  })
})
