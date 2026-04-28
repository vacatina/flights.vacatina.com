import { expect, test } from "vitest"
import type { Offer } from "@duffel/api/types"

import { buildFlightOrderSnapshot } from "@/modules/flights/orders/domain"

test("buildFlightOrderSnapshot uses multi-city summary and leg titles for 3+ legs", () => {
  const offer = createOffer({
    slices: [
      createSlice({
        id: "sli_1",
        originIata: "CMB",
        destinationIata: "DXB",
      }),
      createSlice({
        id: "sli_2",
        originIata: "DXB",
        destinationIata: "LHR",
      }),
      createSlice({
        id: "sli_3",
        originIata: "LHR",
        destinationIata: "SFO",
      }),
    ],
  })

  const snapshot = buildFlightOrderSnapshot({
    offer,
    paymentMode: "pay_now",
    currency: "USD",
    sellAmount: 1200,
  })

  expect(snapshot.journeyTypeLabel).toBe("Multi-city")
  expect(snapshot.routeLabel).toBe("CMB → SFO · 3 legs")
  expect(snapshot.legs.map((leg) => leg.title)).toEqual(["Leg 1", "Leg 2", "Leg 3"])
})

test("buildFlightOrderSnapshot keeps outbound/inbound labels for mirrored return journey", () => {
  const offer = createOffer({
    slices: [
      createSlice({
        id: "sli_1",
        originIata: "CMB",
        destinationIata: "DXB",
      }),
      createSlice({
        id: "sli_2",
        originIata: "DXB",
        destinationIata: "CMB",
      }),
    ],
  })

  const snapshot = buildFlightOrderSnapshot({
    offer,
    paymentMode: "hold",
    currency: "USD",
    sellAmount: 800,
  })

  expect(snapshot.journeyTypeLabel).toBe("Return")
  expect(snapshot.routeLabel).toBe("CMB ⇄ DXB")
  expect(snapshot.legs.map((leg) => leg.title)).toEqual(["Outbound", "Inbound"])
})

function createOffer(input: { slices: Offer["slices"] }) {
  return {
    id: "off_snapshot_1",
    owner: {
      id: "air_zz",
      iata_code: "ZZ",
      icao_code: "ZZZ",
      name: "Duffel Airways",
      logo_symbol_url: null,
      logo_lockup_url: null,
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
