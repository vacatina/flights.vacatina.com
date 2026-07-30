import { expect, test } from "vitest"

import {
  applyOfferClientFilters,
  applyOfferClientSorting,
} from "@/modules/flights/results/domain"
import type { OfferCardViewModel } from "@/modules/flights/results/domain"

const offerA: OfferCardViewModel = {
  id: "off_a",
  ownerName: "Duffel Airways",
  ownerLogoSymbolUrl: null,
  ownerCode: "ZZ",
  departureTimeLabel: "08:00",
  arrivalTimeLabel: "12:00",
  arrivalDayOffset: 0,
  durationLabel: "04h 00m",
  durationMinutes: 240,
  stopsLabel: "Non-stop",
  stopsDetails: null,
  routeLabel: "CMB - DXB",
  flightNumbersLabel: "ZZ8759",
    totalAmountLabel: "USD100.00",
    totalAmountValue: 100,
    totalCurrency: "USD",
    totalMoney: { amount: "10000", currency: "USD", scale: 2 },
  takeoffMinutes: 480,
  landingMinutes: 720,
  timeline: [],
  layovers: [],
  filterTokens: {
    airline: "duffel airways zz",
    flightNumbers: "zz8759",
  },
}

const offerB: OfferCardViewModel = {
  ...offerA,
  id: "off_b",
  ownerName: "Air India",
  ownerCode: "AI",
  durationMinutes: 420,
  totalAmountValue: 300,
  filterTokens: {
    airline: "air india ai",
    flightNumbers: "ai0278",
  },
}

test("applyOfferClientFilters filters by airline, flight number, and time ranges", () => {
  const filtered = applyOfferClientFilters([offerA, offerB], {
    leg: 0,
    selected: [],
    sort: "least_expensive",
    stops: "any",
    airline: "India",
    flightNumber: "0278",
    takeoffFrom: 300,
    takeoffTo: 600,
    landingFrom: 700,
    landingTo: 900,
  })

  expect(filtered).toEqual([offerB])
})

test("applyOfferClientSorting sorts by requested option", () => {
  expect(applyOfferClientSorting([offerA, offerB], "least_expensive")[0]?.id).toBe(
    "off_a"
  )
  expect(applyOfferClientSorting([offerA, offerB], "most_expensive")[0]?.id).toBe(
    "off_b"
  )
  expect(
    applyOfferClientSorting([offerA, offerB], "shortest_duration")[0]?.id
  ).toBe("off_a")
  expect(
    applyOfferClientSorting([offerA, offerB], "longest_duration")[0]?.id
  ).toBe("off_b")
})
