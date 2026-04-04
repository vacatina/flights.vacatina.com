import { expect, test } from "vitest"
import type { Offer, OfferRequest } from "@duffel/api/types"

import { buildReviewPageModel } from "@/modules/flights/results/domain"

const OUTBOUND_ECONOMY_KEY = "cmp_outbound_eco|air_qr|economy convenience|economy"
const OUTBOUND_COMFORT_KEY = "cmp_outbound_comfort|air_qr|economy comfort|economy"
const INBOUND_CLASSIC_KEY = "cmp_inbound_classic|air_qr|economy classic|economy"

const offerRequestFixture = {
  id: "orq_review_1",
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
  offers: [
    createOffer({
      id: "off_1",
      totalAmount: "915.60",
      outboundComparisonKey: "cmp_outbound_eco",
      outboundFareBrand: "Economy Convenience",
      outboundCabinClass: "economy",
      inboundComparisonKey: "cmp_inbound_classic",
      inboundFareBrand: "Economy Classic",
      inboundCabinClass: "economy",
      requiresInstantPayment: false,
      changeCondition: null,
      refundCondition: null,
    }),
    createOffer({
      id: "off_2",
      totalAmount: "943.60",
      outboundComparisonKey: "cmp_outbound_eco",
      outboundFareBrand: "Economy Convenience",
      outboundCabinClass: "economy",
      inboundComparisonKey: "cmp_inbound_comfort",
      inboundFareBrand: "Economy Comfort",
      inboundCabinClass: "economy",
      requiresInstantPayment: false,
      changeCondition: {
        allowed: true,
        penalty_amount: "45.00",
        penalty_currency: "USD",
      },
      refundCondition: {
        allowed: true,
        penalty_amount: "0.00",
        penalty_currency: "USD",
      },
    }),
    createOffer({
      id: "off_3",
      totalAmount: "1261.60",
      outboundComparisonKey: "cmp_outbound_comfort",
      outboundFareBrand: "Economy Comfort",
      outboundCabinClass: "economy",
      inboundComparisonKey: "cmp_inbound_classic",
      inboundFareBrand: "Economy Classic",
      inboundCabinClass: "economy",
      requiresInstantPayment: true,
      changeCondition: {
        allowed: false,
        penalty_amount: null,
        penalty_currency: null,
      },
      refundCondition: {
        allowed: false,
        penalty_amount: null,
        penalty_currency: null,
      },
    }),
  ],
} as unknown as OfferRequest

test("buildReviewPageModel keeps second leg locked until first leg is selected", () => {
  const result = buildReviewPageModel({
    offerRequest: offerRequestFixture,
    selected: ["off_partial_outbound", "off_partial_inbound"],
    requestedFare: [],
  })

  expect(result.state.fare).toEqual([])
  expect(result.legs[0]?.isLocked).toBe(false)
  expect(result.legs[1]?.isLocked).toBe(true)
  expect(result.summary.checkoutEnabled).toBe(false)
  expect(result.summary.totalAmountLabel).toBe("US$915.60")
})

test("buildReviewPageModel narrows next-leg options when previous leg is selected", () => {
  const result = buildReviewPageModel({
    offerRequest: offerRequestFixture,
    selected: ["off_partial_outbound", "off_partial_inbound"],
    requestedFare: [OUTBOUND_ECONOMY_KEY],
  })

  expect(result.state.fare).toEqual([OUTBOUND_ECONOMY_KEY])
  expect(result.legs[1]?.isLocked).toBe(false)
  expect(result.legs[1]?.options).toHaveLength(2)
  expect(result.summary.totalAmountLabel).toBe("US$915.60")
})

test("buildReviewPageModel clears invalid downstream fare selection", () => {
  const result = buildReviewPageModel({
    offerRequest: offerRequestFixture,
    selected: ["off_partial_outbound", "off_partial_inbound"],
    requestedFare: [OUTBOUND_ECONOMY_KEY, "invalid-key"],
  })

  expect(result.state.fare).toEqual([OUTBOUND_ECONOMY_KEY])
  expect(result.summary.checkoutEnabled).toBe(false)
})

test("buildReviewPageModel enables checkout and resolves final offer when all legs are selected", () => {
  const result = buildReviewPageModel({
    offerRequest: offerRequestFixture,
    selected: ["off_partial_outbound", "off_partial_inbound"],
    requestedFare: [OUTBOUND_ECONOMY_KEY, INBOUND_CLASSIC_KEY],
  })

  expect(result.state.fare).toEqual([OUTBOUND_ECONOMY_KEY, INBOUND_CLASSIC_KEY])
  expect(result.summary.checkoutEnabled).toBe(true)
  expect(result.summary.finalOfferId).toBe("off_1")
  expect(result.summary.totalAmountLabel).toBe("US$915.60")
})

test("buildReviewPageModel maps fare condition lines", () => {
  const result = buildReviewPageModel({
    offerRequest: offerRequestFixture,
    selected: ["off_partial_outbound", "off_partial_inbound"],
    requestedFare: [OUTBOUND_COMFORT_KEY],
  })

  const comfortOption = result.legs[0]?.options.find(
    (option) => option.key === OUTBOUND_COMFORT_KEY
  )
  const comfortOptionLines = comfortOption?.lines.map((line) => line.label)

  expect(comfortOptionLines).toContain("Changes not allowed")
  expect(comfortOptionLines).toContain("No data on refunds")
})

function createOffer(input: {
  id: string
  totalAmount: string
  outboundComparisonKey: string
  outboundFareBrand: string
  outboundCabinClass: "economy" | "business"
  inboundComparisonKey: string
  inboundFareBrand: string
  inboundCabinClass: "economy" | "business"
  requiresInstantPayment: boolean
  changeCondition: {
    allowed: boolean
    penalty_amount: string | null
    penalty_currency: string | null
  } | null
  refundCondition: {
    allowed: boolean
    penalty_amount: string | null
    penalty_currency: string | null
  } | null
}) {
  return {
    id: input.id,
    owner: {
      id: "air_qr",
      iata_code: "QR",
      icao_code: "QTR",
      name: "Qatar Airways",
      logo_symbol_url: null,
      logo_lockup_url: null,
    },
    total_amount: input.totalAmount,
    total_currency: "USD",
    total_emissions_kg: "581",
    payment_requirements: {
      requires_instant_payment: input.requiresInstantPayment,
      payment_required_by: input.requiresInstantPayment
        ? null
        : "2026-04-05T12:00:00Z",
      price_guarantee_expires_at: input.requiresInstantPayment
        ? null
        : "2026-04-05T12:00:00Z",
    },
    conditions: {
      change_before_departure: input.changeCondition,
      refund_before_departure: input.refundCondition,
    },
    slices: [
      createSlice({
        id: `${input.id}_out`,
        comparisonKey: input.outboundComparisonKey,
        fareBrand: input.outboundFareBrand,
        cabinClass: input.outboundCabinClass,
        originIata: "CMB",
        destinationIata: "DXB",
        originName: "Bandaranaike International Airport",
        destinationName: "Dubai International Airport",
        departingAt: "2026-04-04T20:20:00+05:30",
        arrivingAt: "2026-04-05T03:25:00+04:00",
      }),
      createSlice({
        id: `${input.id}_in`,
        comparisonKey: input.inboundComparisonKey,
        fareBrand: input.inboundFareBrand,
        cabinClass: input.inboundCabinClass,
        originIata: "DXB",
        destinationIata: "CMB",
        originName: "Dubai International Airport",
        destinationName: "Bandaranaike International Airport",
        departingAt: "2026-04-22T23:25:00+04:00",
        arrivingAt: "2026-04-23T17:45:00+05:30",
      }),
    ],
  } as unknown as Offer
}

function createSlice(input: {
  id: string
  comparisonKey: string
  fareBrand: string
  cabinClass: "economy" | "business"
  originIata: string
  destinationIata: string
  originName: string
  destinationName: string
  departingAt: string
  arrivingAt: string
}) {
  return {
    id: input.id,
    comparison_key: input.comparisonKey,
    duration: "PT8H35M",
    fare_brand_name: input.fareBrand,
    origin: {
      iata_code: input.originIata,
      name: input.originName,
    },
    destination: {
      iata_code: input.destinationIata,
      name: input.destinationName,
    },
    segments: [
      {
        id: `${input.id}_seg_1`,
        duration: "PT8H35M",
        departing_at: input.departingAt,
        arriving_at: input.arrivingAt,
        origin_terminal: null,
        destination_terminal: null,
        origin: {
          iata_code: input.originIata,
          name: input.originName,
        },
        destination: {
          iata_code: input.destinationIata,
          name: input.destinationName,
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
            cabin_class: input.cabinClass,
            cabin_class_marketing_name: "Economy",
            fare_basis_code: "Y",
            cabin: null,
            baggages: [
              {
                type: "carry_on",
                quantity: 1,
              },
              {
                type: "checked",
                quantity: 1,
              },
            ],
          },
        ],
        stops: [],
      },
    ],
  }
}
