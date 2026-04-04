import { expect, test } from "vitest"
import type { Offer, OfferRequest } from "@duffel/api/types"

import { fetchReviewPageData } from "@/modules/flights/results/server/review-service"

const baseOfferRequestFixture = {
  id: "prq_1",
  created_at: "2026-04-01T00:00:00Z",
  live_mode: false,
  passengers: [{ id: "pas_1", type: "adult" }],
  slices: [
    {
      origin: { iata_code: "CMB" },
      destination: { iata_code: "DXB" },
      departure_date: "2026-04-04",
    },
    {
      origin: { iata_code: "DXB" },
      destination: { iata_code: "CMB" },
      departure_date: "2026-04-22",
    },
  ],
  offers: [],
} as unknown as OfferRequest

const faresOfferRequestFixture = {
  ...baseOfferRequestFixture,
  offers: [
    {
      id: "off_1",
      owner: {
        id: "air_qr",
        iata_code: "QR",
        icao_code: "QTR",
        name: "Qatar Airways",
        logo_symbol_url: null,
        logo_lockup_url: null,
      },
      total_amount: "915.60",
      total_currency: "USD",
      total_emissions_kg: "581",
      payment_requirements: {
        requires_instant_payment: false,
        payment_required_by: "2026-04-05T12:00:00Z",
        price_guarantee_expires_at: "2026-04-05T12:00:00Z",
      },
      conditions: {
        change_before_departure: null,
        refund_before_departure: null,
      },
      slices: [
        createSlice("sli_out", "cmp_out", "Economy Convenience", "economy", "CMB", "DXB"),
        createSlice("sli_in", "cmp_in", "Economy Classic", "economy", "DXB", "CMB"),
      ],
    },
  ],
} as unknown as OfferRequest

test("fetchReviewPageData returns review data for valid selection", async () => {
  let selectedOffers: string[] | null = null

  const result = await fetchReviewPageData(
    {
      partialOfferRequestId: "prq_1",
      state: {
        selected: ["off_partial_1", "off_partial_2"],
        fare: [],
      },
    },
    {
      async getBaseOfferRequest() {
        return baseOfferRequestFixture
      },
      async getFaresBySelected(_, selected) {
        selectedOffers = selected
        return faresOfferRequestFixture
      },
      async getAirlineLogosByAirlineId() {
        return {}
      },
    }
  )

  expect(selectedOffers).toEqual(["off_partial_1", "off_partial_2"])
  expect(result.totalLegs).toBe(2)
  expect(result.legs).toHaveLength(2)
  expect(result.summary.totalAmountLabel).toBe("US$915.60")
})

test("fetchReviewPageData rejects duplicate selected partial offers", async () => {
  await expect(
    fetchReviewPageData(
      {
        partialOfferRequestId: "prq_1",
        state: {
          selected: ["off_partial_1", "off_partial_1"],
          fare: [],
        },
      },
      {
        async getBaseOfferRequest() {
          return baseOfferRequestFixture
        },
        async getFaresBySelected() {
          return faresOfferRequestFixture
        },
        async getAirlineLogosByAirlineId() {
          return {}
        },
      }
    )
  ).rejects.toThrow(/Invalid fare selection state/)
})

test("fetchReviewPageData rejects selected count mismatch", async () => {
  await expect(
    fetchReviewPageData(
      {
        partialOfferRequestId: "prq_1",
        state: {
          selected: ["off_partial_1"],
          fare: [],
        },
      },
      {
        async getBaseOfferRequest() {
          return baseOfferRequestFixture
        },
        async getFaresBySelected() {
          return faresOfferRequestFixture
        },
        async getAirlineLogosByAirlineId() {
          return {}
        },
      }
    )
  ).rejects.toThrow(/Invalid fare selection state/)
})

test("fetchReviewPageData surfaces empty fares state", async () => {
  await expect(
    fetchReviewPageData(
      {
        partialOfferRequestId: "prq_1",
        state: {
          selected: ["off_partial_1", "off_partial_2"],
          fare: [],
        },
      },
      {
        async getBaseOfferRequest() {
          return baseOfferRequestFixture
        },
        async getFaresBySelected() {
          return {
            ...faresOfferRequestFixture,
            offers: [],
          } as OfferRequest
        },
        async getAirlineLogosByAirlineId() {
          return {}
        },
      }
    )
  ).rejects.toThrow(/No fare options are available/)
})

test("fetchReviewPageData propagates upstream errors", async () => {
  await expect(
    fetchReviewPageData(
      {
        partialOfferRequestId: "prq_1",
        state: {
          selected: ["off_partial_1", "off_partial_2"],
          fare: [],
        },
      },
      {
        async getBaseOfferRequest() {
          return baseOfferRequestFixture
        },
        async getFaresBySelected() {
          throw new Error("Upstream unavailable")
        },
        async getAirlineLogosByAirlineId() {
          return {}
        },
      }
    )
  ).rejects.toThrow("Upstream unavailable")
})

function createSlice(
  id: string,
  comparisonKey: string,
  fareBrand: string,
  cabinClass: "economy" | "business",
  originCode: string,
  destinationCode: string
) {
  return {
    id,
    comparison_key: comparisonKey,
    duration: "PT8H35M",
    fare_brand_name: fareBrand,
    origin: {
      iata_code: originCode,
      name: originCode,
    },
    destination: {
      iata_code: destinationCode,
      name: destinationCode,
    },
    segments: [
      {
        id: `${id}_seg_1`,
        duration: "PT8H35M",
        departing_at: "2026-04-04T20:20:00+05:30",
        arriving_at: "2026-04-05T03:25:00+04:00",
        origin_terminal: null,
        destination_terminal: null,
        origin: {
          iata_code: originCode,
          name: originCode,
        },
        destination: {
          iata_code: destinationCode,
          name: destinationCode,
        },
        marketing_carrier: {
          id: "air_qr",
          iata_code: "QR",
          icao_code: "QTR",
          name: "Qatar Airways",
          logo_symbol_url: null,
          logo_lockup_url: null,
        },
        marketing_carrier_flight_number: "1234",
        operating_carrier: {
          id: "air_qr",
          iata_code: "QR",
          icao_code: "QTR",
          name: "Qatar Airways",
          logo_symbol_url: null,
          logo_lockup_url: null,
        },
        operating_carrier_flight_number: "1234",
        aircraft: {
          id: "arc_1",
          iata_code: "789",
          name: "Boeing 787-9",
        },
        distance: "1000",
        passengers: [
          {
            passenger_id: "pas_1",
            cabin_class: cabinClass,
            cabin_class_marketing_name: "Economy",
            fare_basis_code: "Y",
            cabin: null,
            baggages: [
              {
                type: "carry_on",
                quantity: 1,
              },
            ],
          },
        ],
        stops: [],
      },
    ],
  } as unknown as Offer["slices"][number]
}
