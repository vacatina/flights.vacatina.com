import { expect, test } from "vitest"

import { fetchFareOptionsData } from "@/modules/flights/results/server/service"
import type { OfferRequest, Offer } from "@duffel/api/types"

const offerRequestFixture = {
  id: "por_123",
  created_at: "2026-04-18T00:00:00Z",
  live_mode: false,
  cabin_class: "economy",
  passengers: [{ id: "pas_1", type: "adult" }],
  slices: [
    {
      origin: { iata_code: "CMB" },
      destination: { iata_code: "DXB" },
      origin_type: "airport",
      destination_type: "airport",
      departure_date: "2026-04-18",
    },
    {
      origin: { iata_code: "DXB" },
      destination: { iata_code: "CMB" },
      origin_type: "airport",
      destination_type: "airport",
      departure_date: "2026-04-25",
    },
  ],
  offers: [{ offer_request_id: "orq_123" }],
} as unknown as OfferRequest

const offerFixture = {
  id: "off_1",
  offer_request_id: "orq_123",
  owner: {
    id: "air_zz",
    iata_code: "ZZ",
    icao_code: "ZZZ",
    name: "Duffel Airways",
    logo_symbol_url: null,
    logo_lockup_url: null,
  },
  total_amount: "352.85",
  total_currency: "USD",
  slices: [
    {
      id: "sli_1",
      origin: { iata_code: "CMB", name: "Bandaranaike International Airport" },
      destination: { iata_code: "DXB", name: "Dubai International Airport" },
      origin_type: "airport",
      destination_type: "airport",
      duration: "PT4H58M",
      fare_brand_name: null,
      conditions: {
        change_before_departure: null,
        refund_before_departure: null,
      },
      ngs_shelf: null,
      comparison_key: "cmp_1",
      segments: [
        {
          id: "seg_1",
          aircraft: { id: "arc_1", iata_code: "321", name: "Airbus A321" },
          arriving_at: "2026-04-18T16:37:00+04:00",
          destination_terminal: "1",
          departing_at: "2026-04-18T13:09:00+05:30",
          origin_terminal: "2",
          destination: { iata_code: "DXB", name: "Dubai International Airport" },
          origin: { iata_code: "CMB", name: "Bandaranaike International Airport" },
          distance: "2000",
          duration: "PT4H58M",
          marketing_carrier: {
            id: "air_zz",
            iata_code: "ZZ",
            icao_code: "ZZZ",
            name: "Duffel Airways",
            logo_symbol_url: null,
            logo_lockup_url: null,
          },
          marketing_carrier_flight_number: "8759",
          operating_carrier: {
            id: "air_zz",
            iata_code: "ZZ",
            icao_code: "ZZZ",
            name: "Duffel Airways",
            logo_symbol_url: null,
            logo_lockup_url: null,
          },
          operating_carrier_flight_number: "8759",
          passengers: [
            {
              baggages: [{ type: "carry_on", quantity: 1 }],
              cabin_class: "economy",
              cabin_class_marketing_name: "Economy",
              passenger_id: "pas_1",
              fare_basis_code: "Y",
              cabin: null,
            },
          ],
          stops: [],
        },
      ],
    },
  ],
} as unknown as Offer

test("fetchFareOptionsData uses selected offers and returns normalized data", async () => {
  let selectedParam: string[] | null = null

  const result = await fetchFareOptionsData(
    {
      partialOfferRequestId: "por_123",
      state: {
        leg: 1,
        selected: ["off_partial_1"],
        sort: "least_expensive",
        stops: "any",
        takeoffFrom: 0,
        takeoffTo: 1439,
        landingFrom: 0,
        landingTo: 1439,
      },
    },
    {
      async getBaseOfferRequest() {
        return offerRequestFixture
      },
      async getOfferRequestBySelected(_, selected) {
        selectedParam = selected
        return offerRequestFixture
      },
      async getAirlineLogosByAirlineId() {
        return {}
      },
      async listOffers() {
        return {
          data: [offerFixture],
          meta: {
            after: "cursor_2",
          },
        }
      },
    }
  )

  expect(selectedParam).toEqual(["off_partial_1"])
  expect(result.leg).toBe(1)
  expect(result.breadcrumbs.length).toBe(2)
  expect(result.offers.length).toBe(1)
  expect(result.after).toBe("cursor_2")
})

test("fetchFareOptionsData clamps leg into valid range", async () => {
  const result = await fetchFareOptionsData(
    {
      partialOfferRequestId: "por_123",
      state: {
        leg: 9,
        selected: ["off_partial_1"],
        sort: "least_expensive",
        stops: "any",
        takeoffFrom: 0,
        takeoffTo: 1439,
        landingFrom: 0,
        landingTo: 1439,
      },
    },
    {
      async getBaseOfferRequest() {
        return offerRequestFixture
      },
      async getOfferRequestBySelected() {
        return offerRequestFixture
      },
      async getAirlineLogosByAirlineId() {
        return {}
      },
      async listOffers() {
        return {
          data: [offerFixture],
        }
      },
    }
  )

  expect(result.leg).toBe(1)
})

test("fetchFareOptionsData rejects missing selected offers for the requested leg", async () => {
  await expect(
    fetchFareOptionsData(
      {
        partialOfferRequestId: "por_123",
        state: {
          leg: 1,
          selected: [],
          sort: "least_expensive",
          stops: "any",
          takeoffFrom: 0,
          takeoffTo: 1439,
          landingFrom: 0,
          landingTo: 1439,
        },
      },
      {
        async getBaseOfferRequest() {
          return offerRequestFixture
        },
        async getOfferRequestBySelected() {
          return offerRequestFixture
        },
        async getAirlineLogosByAirlineId() {
          return {}
        },
        async listOffers() {
          return {
            data: [offerFixture],
          }
        },
      }
    )
  ).rejects.toThrow(/Invalid fare selection state/)
})

test("fetchFareOptionsData rejects too many selected offers for the journey", async () => {
  await expect(
    fetchFareOptionsData(
      {
        partialOfferRequestId: "por_123",
        state: {
          leg: 0,
          selected: ["off_partial_1", "off_partial_2"],
          sort: "least_expensive",
          stops: "any",
          takeoffFrom: 0,
          takeoffTo: 1439,
          landingFrom: 0,
          landingTo: 1439,
        },
      },
      {
        async getBaseOfferRequest() {
          return offerRequestFixture
        },
        async getOfferRequestBySelected() {
          return offerRequestFixture
        },
        async getAirlineLogosByAirlineId() {
          return {}
        },
        async listOffers() {
          return {
            data: [offerFixture],
          }
        },
      }
    )
  ).rejects.toThrow(/Invalid fare selection state/)
})

test("fetchFareOptionsData rejects duplicate selected offer IDs", async () => {
  await expect(
    fetchFareOptionsData(
      {
        partialOfferRequestId: "por_123",
        state: {
          leg: 1,
          selected: ["off_partial_1", "off_partial_1"],
          sort: "least_expensive",
          stops: "any",
          takeoffFrom: 0,
          takeoffTo: 1439,
          landingFrom: 0,
          landingTo: 1439,
        },
      },
      {
        async getBaseOfferRequest() {
          return offerRequestFixture
        },
        async getOfferRequestBySelected() {
          return offerRequestFixture
        },
        async getAirlineLogosByAirlineId() {
          return {}
        },
        async listOffers() {
          return {
            data: [offerFixture],
          }
        },
      }
    )
  ).rejects.toThrow(/Invalid fare selection state/)
})

test("fetchFareOptionsData omits undefined pagination cursor in list params", async () => {
  let receivedListParams: {
    offer_request_id: string
    after?: string
    limit: number
    sort: "total_amount" | "total_duration"
    max_connections: number
  } | null = null

  await fetchFareOptionsData(
    {
      partialOfferRequestId: "por_123",
      state: {
        leg: 0,
        selected: [],
        sort: "least_expensive",
        stops: "any",
        takeoffFrom: 0,
        takeoffTo: 1439,
        landingFrom: 0,
        landingTo: 1439,
        after: undefined,
      },
    },
    {
      async getBaseOfferRequest() {
        return offerRequestFixture
      },
      async getOfferRequestBySelected() {
        return offerRequestFixture
      },
      async getAirlineLogosByAirlineId() {
        return {}
      },
      async listOffers(params) {
        receivedListParams = params
        return {
          data: [offerFixture],
        }
      },
    }
  )

  expect(receivedListParams).not.toBeNull()
  expect(receivedListParams).not.toHaveProperty("after")
})

test("fetchFareOptionsData applies fetched airline logos", async () => {
  const logoUrl = "https://assets.duffel.com/img/airlines/zz-symbol.png"

  const result = await fetchFareOptionsData(
    {
      partialOfferRequestId: "por_123",
      state: {
        leg: 0,
        selected: [],
        sort: "least_expensive",
        stops: "any",
        takeoffFrom: 0,
        takeoffTo: 1439,
        landingFrom: 0,
        landingTo: 1439,
      },
    },
    {
      async getBaseOfferRequest() {
        return offerRequestFixture
      },
      async getOfferRequestBySelected() {
        return offerRequestFixture
      },
      async getAirlineLogosByAirlineId() {
        return {
          air_zz: logoUrl,
        }
      },
      async listOffers() {
        return {
          data: [offerFixture],
        }
      },
    }
  )

  expect(result.offers[0]?.ownerLogoSymbolUrl).toBe(logoUrl)
})
