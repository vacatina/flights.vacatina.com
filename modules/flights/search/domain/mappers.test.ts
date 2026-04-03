import { expect, test } from "vitest"

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
  expect(formatPlaceDisplayName(colomboAirport)).toBe(
    "Colombo - Bandaranaike International (CMB)"
  )
  expect(formatPlaceDisplayName(singaporeCity)).toBe("Singapore (SIN)")
})

test("formatPassengerSummary creates a readable summary", () => {
  expect(formatPassengerSummary({ adults: 1, children: 0, childrenAges: [] })).toBe(
    "1 adult"
  )
  expect(
    formatPassengerSummary({ adults: 2, children: 2, childrenAges: [6, 11] })
  ).toBe(
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
      childrenAges: [9],
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

  expect(command).toEqual({
    journeyType: "one_way",
    cabinClass: "business",
    passengers: {
      adults: 2,
      children: 1,
      childrenAges: [9],
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

test("toFlightSearchCommand infers inbound endpoints for return journeys", () => {
  const values: FlightSearchFormValues = {
    journeyType: "return",
    cabinClass: "economy",
    passengers: {
      adults: 1,
      children: 0,
      childrenAges: [],
    },
    slices: [
      {
        origin: colomboAirport,
        destination: singaporeCity,
        departureDate: "2026-12-24",
        departureTime: null,
        arrivalTime: null,
      },
      {
        origin: null,
        destination: null,
        departureDate: "2027-01-02",
        departureTime: null,
        arrivalTime: null,
      },
    ],
  }

  const command = toFlightSearchCommand(values)

  expect(command.slices[1]).toEqual({
    originIataCode: "SIN",
    destinationIataCode: "CMB",
    departureDate: "2027-01-02",
    departureTime: null,
    arrivalTime: null,
  })
})
