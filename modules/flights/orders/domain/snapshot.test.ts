import { expect, test } from "vitest"
import type { Offer } from "@duffel/api/types"
import type { FlightOrderRecord } from "@/modules/flights/checkout/server/order-repository"

import {
  buildFlightOrderSnapshot,
  mapFlightOrderToDetailModel,
  mapFlightOrderToListItem,
} from "@/modules/flights/orders/domain"

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

test("buildFlightOrderSnapshot stores version 2 raw money values", () => {
  const snapshot = buildFlightOrderSnapshot({
    offer: createOffer({
      slices: [
        createSlice({
          id: "sli_1",
          originIata: "CMB",
          destinationIata: "DXB",
        }),
      ],
    }),
    paymentMode: "pay_now",
    currency: "USD",
    sellAmount: 915.6,
  })

  expect(snapshot.schemaVersion).toBe(2)
  expect(snapshot.sellMoney).toEqual({
    amount: "91560",
    currency: "USD",
    scale: 2,
  })
  expect(snapshot.billingSummary.totalMoney).toEqual(snapshot.sellMoney)
})

test("mapFlightOrderToListItem includes enriched booking list fields", () => {
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
    paymentMode: "pay_now",
    currency: "USD",
    sellAmount: 915.6,
  })
  const order = createFlightOrderRecord({
    paymentMode: "pay_now",
    paymentAwaiting: false,
    orderSnapshot: snapshot,
  })

  const item = mapFlightOrderToListItem(order)

  expect(item.bookingReference).toBe("BK-F60F36ABAD")
  expect(item.journeyTypeLabel).toBe("Return")
  expect(item.legCount).toBe(2)
  expect(item.passengerCount).toBe(1)
  expect(item.airlineName).toBe("Duffel Airways")
  expect(item.statusCode).toBe("confirmed")
  expect(item.departureDateLabel).toBe("4 Apr 2026")
  expect(item.returnDateLabel).toBe("4 Apr 2026")
})

test("mapFlightOrderToListItem maps payment pending status code", () => {
  const order = createFlightOrderRecord({
    paymentMode: "pay_now",
    paymentAwaiting: true,
    orderSnapshot: {},
  })

  const item = mapFlightOrderToListItem(order)

  expect(item.statusCode).toBe("payment_pending")
  expect(item.departureDateLabel).toBeNull()
  expect(item.returnDateLabel).toBeNull()
})

test("mapFlightOrderToDetailModel recovers a version 1 total from authoritative columns", () => {
  const order = createFlightOrderRecord({
    paymentMode: "pay_now",
    paymentAwaiting: false,
    orderSnapshot: {
      schemaVersion: 1,
      currency: "USD",
      sellAmount: 915.6,
      sellAmountLabel: "US$915.60",
      billingSummary: {
        fareAmountLabel: "US$800.00",
        taxesAmountLabel: "US$115.60",
        totalAmountLabel: "US$915.60",
      },
    },
  })

  const detail = mapFlightOrderToDetailModel(order)

  expect(detail.snapshot.schemaVersion).toBe(1)
  expect(detail.snapshot.billingSummary.fareMoney).toBeNull()
  expect(detail.snapshot.billingSummary.totalMoney).toEqual({
    amount: "91560",
    currency: "USD",
    scale: 2,
  })
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

function createFlightOrderRecord(input: {
  paymentMode: "pay_now" | "hold"
  paymentAwaiting: boolean
  orderSnapshot: Record<string, unknown>
}): FlightOrderRecord {
  return {
    id: "ordr_1",
    bookingReference: "BK-F60F36ABAD",
    checkoutSessionId: "chs_1",
    duffelOrderId: "ord_1",
    partialOfferRequestId: "prq_1",
    offerId: "off_1",
    selectedPartialOffers: ["off_partial_1"],
    ownerUserId: "usr_1",
    ownerGuestId: null,
    ownerOrgId: null,
    contactEmail: "hashsandbox@gmail.com",
    contactEmailHash: "hash_1",
    paymentMode: input.paymentMode,
    settlementType: "balance",
    currency: "USD",
    netAmount: 800,
    sellAmount: 915.6,
    duffelTotalAmount: 800,
    duffelTotalCurrency: "USD",
    paymentAwaiting: input.paymentAwaiting,
    paymentRequiredBy: null,
    priceGuaranteeExpiresAt: null,
    paidAt: null,
    orderSnapshot: input.orderSnapshot,
    createdAt: new Date("2026-04-28T13:04:00.000Z"),
    updatedAt: new Date("2026-04-28T13:04:00.000Z"),
  }
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
