import { expect, test } from "vitest"

import {
  createSearchSummary,
  normalizeOfferForLeg,
  toDurationMinutes,
} from "@/modules/flights/results/domain"
import type { Offer, OfferRequest } from "@duffel/api/types"

const baseOffer = {
  id: "off_test_1",
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
      origin: {
        id: "arp_cmb_lk",
        iata_code: "CMB",
        iata_country_code: "LK",
        iata_city_code: "CMB",
        name: "Bandaranaike International Airport",
        type: "airport",
        city_name: "Colombo",
      },
      destination: {
        id: "arp_dxb_ae",
        iata_code: "DXB",
        iata_country_code: "AE",
        iata_city_code: "DXB",
        name: "Dubai International Airport",
        type: "airport",
        city_name: "Dubai",
      },
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
          aircraft: {
            iata_code: "321",
            id: "arc_1",
            name: "Airbus A321",
          },
          arriving_at: "2026-04-18T16:37:00+04:00",
          destination_terminal: "1",
          departing_at: "2026-04-18T13:09:00+05:30",
          origin_terminal: "2",
          destination: {
            id: "arp_dxb_ae",
            iata_code: "DXB",
            iata_country_code: "AE",
            iata_city_code: "DXB",
            name: "Dubai International Airport",
            type: "airport",
            city_name: "Dubai",
            city: null,
            longitude: 55.3644,
            latitude: 25.2528,
            icao_code: "OMDB",
            time_zone: "Asia/Dubai",
            airports: null,
            country_name: "UAE",
          },
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
          origin: {
            id: "arp_cmb_lk",
            iata_code: "CMB",
            iata_country_code: "LK",
            iata_city_code: "CMB",
            name: "Bandaranaike International Airport",
            type: "airport",
            city_name: "Colombo",
            city: null,
            longitude: 79.8841,
            latitude: 7.18,
            icao_code: "VCBI",
            time_zone: "Asia/Colombo",
            airports: null,
            country_name: "Sri Lanka",
          },
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
              baggages: [
                { quantity: 1, type: "carry_on" },
                { quantity: 1, type: "checked" },
              ],
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

test("normalizeOfferForLeg maps a single-segment offer", () => {
  const normalized = normalizeOfferForLeg(baseOffer, 0)

  expect(normalized).not.toBeNull()
  expect(normalized?.stopsLabel).toBe("Non-stop")
  expect(normalized?.flightNumbersLabel).toBe("ZZ8759")
  expect(normalized?.durationLabel).toBe("04h 58m")
  expect(normalized?.timeline.length).toBe(2)
})

test("toDurationMinutes parses ISO duration values", () => {
  expect(toDurationMinutes("PT4H58M")).toBe(298)
  expect(toDurationMinutes("P1DT2H")).toBe(1560)
  expect(toDurationMinutes(null)).toBeNull()
})

test("normalizeOfferForLeg handles missing aircraft details", () => {
  const offerWithMissingAircraft = {
    ...baseOffer,
    slices: [
      {
        ...baseOffer.slices[0],
        segments: [
          {
            ...baseOffer.slices[0].segments[0],
            aircraft: null,
          },
        ],
      },
    ],
  } as unknown as Offer

  const normalized = normalizeOfferForLeg(offerWithMissingAircraft, 0)

  expect(normalized).not.toBeNull()
  expect(normalized?.timeline[1]?.meta).not.toContain("Airbus A321")
})

test("normalizeOfferForLeg returns null for invalid segment date-times without throwing", () => {
  const malformedOffer = {
    ...baseOffer,
    slices: [
      {
        ...baseOffer.slices[0],
        segments: [
          {
            ...baseOffer.slices[0].segments[0],
            departing_at: "not-a-date",
            arriving_at: "still-not-a-date",
          },
        ],
      },
    ],
  } as unknown as Offer

  expect(() => normalizeOfferForLeg(malformedOffer, 0)).not.toThrow()
  expect(normalizeOfferForLeg(malformedOffer, 0)).toBeNull()
})

test("createSearchSummary formats date-only labels without timezone shifting", () => {
  const offerRequest = {
    id: "orq_1",
    created_at: "2026-04-01T00:00:00Z",
    live_mode: false,
    cabin_class: "economy",
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
        departure_date: "2026-04-07",
      },
    ],
    offers: [],
  } as unknown as OfferRequest

  const summary = createSearchSummary(offerRequest, 0)

  expect(summary.dateRangeLabel).toBe("04 Apr - 07 Apr · 1 passenger")
})
