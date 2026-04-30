import { expect, test } from "vitest"
import type { OfferRequest } from "@duffel/api/types"

import {
  createSearchPrefillHrefFromOfferRequest,
  createSearchPrefillToken,
  parseSearchPrefillToken,
  type FlightSearchFormValues,
} from "@/modules/flights/search/domain"

const oneWayValues: FlightSearchFormValues = {
  journeyType: "one_way",
  cabinClass: "economy",
  passengers: {
    adults: 1,
    children: 1,
    childrenAges: [8],
  },
  slices: [
    {
      origin: {
        id: "arp_cmb",
        type: "airport",
        iataCode: "CMB",
        iataCityCode: "CMB",
        name: "Bandaranaike International Airport",
        cityName: "Colombo",
        countryCode: "LK",
        countryName: "Sri Lanka",
        displayName: "Colombo - Bandaranaike International Airport (CMB)",
      },
      destination: {
        id: "arp_dxb",
        type: "airport",
        iataCode: "DXB",
        iataCityCode: "DXB",
        name: "Dubai International Airport",
        cityName: "Dubai",
        countryCode: "AE",
        countryName: "United Arab Emirates",
        displayName: "Dubai - Dubai International Airport (DXB)",
      },
      departureDate: "2026-05-01",
      departureTime: null,
      arrivalTime: null,
    },
  ],
}

test("search prefill token roundtrip for one-way values", () => {
  const token = createSearchPrefillToken(oneWayValues)

  expect(token).toBeTruthy()

  const parsed = parseSearchPrefillToken(token)

  expect(parsed).toEqual(oneWayValues)
})

test("search prefill token roundtrip for return values", () => {
  const returnValues: FlightSearchFormValues = {
    ...oneWayValues,
    journeyType: "return",
    slices: [
      oneWayValues.slices[0],
      {
        origin: oneWayValues.slices[0].destination,
        destination: oneWayValues.slices[0].origin,
        departureDate: "2026-05-08",
        departureTime: null,
        arrivalTime: null,
      },
    ],
  }
  const token = createSearchPrefillToken(returnValues)

  expect(token).toBeTruthy()

  const parsed = parseSearchPrefillToken(token)

  expect(parsed).toEqual(returnValues)
})

test("parseSearchPrefillToken returns null for malformed payload", () => {
  expect(parseSearchPrefillToken("not-base64")).toBeNull()

  const invalidVersionToken = Buffer.from(
    JSON.stringify({
      v: 999,
      journeyType: "one_way",
      cabinClass: "economy",
      passengers: {
        adults: 1,
        children: 0,
        childrenAges: [],
      },
      slices: [
        {
          origin: null,
          destination: null,
          departureDate: "2026-05-01",
          departureTime: null,
          arrivalTime: null,
        },
      ],
    }),
    "utf-8"
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

  expect(parseSearchPrefillToken(invalidVersionToken)).toBeNull()
})

test("parseSearchPrefillToken returns null when children ages are inconsistent", () => {
  const inconsistentToken = Buffer.from(
    JSON.stringify({
      v: 1,
      journeyType: "one_way",
      cabinClass: "economy",
      passengers: {
        adults: 1,
        children: 2,
        childrenAges: [3],
      },
      slices: [
        {
          origin: oneWayValues.slices[0].origin,
          destination: oneWayValues.slices[0].destination,
          departureDate: "2026-05-01",
          departureTime: null,
          arrivalTime: null,
        },
      ],
    }),
    "utf-8"
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

  expect(parseSearchPrefillToken(inconsistentToken)).toBeNull()
})

test("createSearchPrefillHrefFromOfferRequest returns prefilled home URL", () => {
  const offerRequest = {
    cabin_class: "economy",
    passengers: [
      { id: "pas_1", type: "adult" },
      { id: "pas_2", type: "child", age: 7 },
    ],
    slices: [
      {
        origin_type: "airport",
        destination_type: "airport",
        departure_date: "2026-05-01",
        origin: {
          id: "arp_cmb",
          iata_code: "CMB",
          iata_city_code: "CMB",
          iata_country_code: "LK",
          name: "Bandaranaike International Airport",
          city_name: "Colombo",
        },
        destination: {
          id: "arp_dxb",
          iata_code: "DXB",
          iata_city_code: "DXB",
          iata_country_code: "AE",
          name: "Dubai International Airport",
          city_name: "Dubai",
        },
      },
      {
        origin_type: "airport",
        destination_type: "airport",
        departure_date: "2026-05-08",
        origin: {
          id: "arp_dxb",
          iata_code: "DXB",
          iata_city_code: "DXB",
          iata_country_code: "AE",
          name: "Dubai International Airport",
          city_name: "Dubai",
        },
        destination: {
          id: "arp_cmb",
          iata_code: "CMB",
          iata_city_code: "CMB",
          iata_country_code: "LK",
          name: "Bandaranaike International Airport",
          city_name: "Colombo",
        },
      },
    ],
  } as unknown as OfferRequest

  const href = createSearchPrefillHrefFromOfferRequest(offerRequest)
  const token = new URLSearchParams(href.split("?")[1]).get("prefill")
  const parsed = parseSearchPrefillToken(token)

  expect(href.startsWith("/?prefill=")).toBe(true)
  expect(parsed).not.toBeNull()
  expect(parsed?.journeyType).toBe("return")
  expect(parsed?.passengers).toEqual({
    adults: 1,
    children: 1,
    childrenAges: [7],
  })
})
