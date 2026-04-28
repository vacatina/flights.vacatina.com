import { expect, test } from "vitest"
import type { Offer } from "@duffel/api/types"

import { buildCheckoutPageModel } from "@/modules/flights/checkout/domain/view-model"

test("buildCheckoutPageModel uses multi-city labels for 3+ legs", () => {
  const offer = createOffer({
    slices: [
      createSlice({ id: "sli_1", originIata: "CMB", destinationIata: "DXB" }),
      createSlice({ id: "sli_2", originIata: "DXB", destinationIata: "LHR" }),
      createSlice({ id: "sli_3", originIata: "LHR", destinationIata: "SFO" }),
    ],
  })

  const model = buildCheckoutPageModel({
    partialOfferRequestId: "prq_1",
    state: {
      offerId: "off_1",
      selectedPartialOffers: ["off_1_0", "off_1_1", "off_1_2"],
      quoteId: "pqt_1",
      step: "traveler",
    },
    offer,
    seatMaps: [],
    quote: {
      id: "pqt_1",
      currency: "USD",
      netAmount: 1000,
      sellAmount: 1100,
      expiresAt: new Date("2026-04-04T00:00:00Z"),
    },
  })

  expect(model.tripSummary.journeyTypeLabel).toBe("Multi-city")
  expect(model.tripSummary.routeLabel).toBe("CMB → SFO · 3 legs")
  expect(model.selectedFlights.map((flight) => flight.legTitle)).toEqual([
    "Leg 1",
    "Leg 2",
    "Leg 3",
  ])
})

test("buildCheckoutPageModel keeps return labels for mirrored 2-leg trips", () => {
  const offer = createOffer({
    slices: [
      createSlice({ id: "sli_1", originIata: "CMB", destinationIata: "DXB" }),
      createSlice({ id: "sli_2", originIata: "DXB", destinationIata: "CMB" }),
    ],
  })

  const model = buildCheckoutPageModel({
    partialOfferRequestId: "prq_1",
    state: {
      offerId: "off_1",
      selectedPartialOffers: ["off_1_0", "off_1_1"],
      quoteId: "pqt_1",
      step: "traveler",
    },
    offer,
    seatMaps: [],
    quote: {
      id: "pqt_1",
      currency: "USD",
      netAmount: 1000,
      sellAmount: 1100,
      expiresAt: new Date("2026-04-04T00:00:00Z"),
    },
  })

  expect(model.tripSummary.journeyTypeLabel).toBe("Return")
  expect(model.tripSummary.routeLabel).toBe("CMB ⇄ DXB")
  expect(model.selectedFlights.map((flight) => flight.legTitle)).toEqual([
    "Outbound",
    "Inbound",
  ])
})

function createOffer(input: { slices: Offer["slices"] }) {
  return {
    id: "off_checkout_1",
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
    passenger_identity_documents_required: false,
    supported_passenger_identity_document_types: ["passport"],
    payment_requirements: {
      requires_instant_payment: false,
      payment_required_by: null,
      price_guarantee_expires_at: null,
    },
    passengers: [{ id: "pas_1", type: "adult" }],
    slices: input.slices,
  } as unknown as Offer
}

function createSlice(input: {
  id: string
  originIata: string
  destinationIata: string
}): Offer["slices"][number] {
  return {
    id: input.id,
    duration: "PT4H58M",
    origin: {
      iata_code: input.originIata,
      name: `${input.originIata} Airport`,
    },
    destination: {
      iata_code: input.destinationIata,
      name: `${input.destinationIata} Airport`,
    },
    segments: [
      {
        id: `${input.id}_seg_1`,
        duration: "PT4H58M",
        departing_at: "2026-04-04T20:20:00+05:30",
        arriving_at: "2026-04-05T03:25:00+04:00",
        origin_terminal: null,
        destination_terminal: null,
        origin: {
          iata_code: input.originIata,
          name: `${input.originIata} Airport`,
        },
        destination: {
          iata_code: input.destinationIata,
          name: `${input.destinationIata} Airport`,
        },
        marketing_carrier: {
          id: "air_zz",
          iata_code: "ZZ",
          icao_code: "ZZZ",
          name: "Duffel Airways",
          logo_symbol_url: null,
          logo_lockup_url: null,
        },
        marketing_carrier_flight_number: "1234",
        operating_carrier: {
          id: "air_zz",
          iata_code: "ZZ",
          icao_code: "ZZZ",
          name: "Duffel Airways",
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
            cabin_class: "economy",
            cabin_class_marketing_name: "Economy",
            fare_basis_code: "Y",
            cabin: null,
            baggages: [],
          },
        ],
        stops: [],
      },
    ],
  } as unknown as Offer["slices"][number]
}
