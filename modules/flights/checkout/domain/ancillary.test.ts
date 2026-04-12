import { expect, test } from "vitest"
import type { Offer } from "@duffel/api/types"

import {
  computeAncillaryPricing,
  normalizeAncillarySelection,
} from "@/modules/flights/checkout/domain/ancillary"

const offerFixture = {
  id: "off_1",
  total_currency: "USD",
  available_services: [
    {
      id: "ase_bag_1",
      total_amount: "30.00",
      total_currency: "USD",
      type: "baggage",
    },
    {
      id: "ase_seat_1",
      total_amount: "10.00",
      total_currency: "USD",
      type: "baggage",
    },
  ],
} as unknown as Offer

test("normalizeAncillarySelection deduplicates service quantities", () => {
  const result = normalizeAncillarySelection({
    services: [
      { id: "ase_bag_1", quantity: 1 },
      { id: "ase_bag_1", quantity: 2 },
    ],
  })

  expect(result.services).toEqual([{ id: "ase_bag_1", quantity: 3 }])
})

test("computeAncillaryPricing calculates net and sell totals", () => {
  const result = computeAncillaryPricing({
    offer: offerFixture,
    expectedCurrency: "USD",
    selectedServices: [
      { id: "ase_bag_1", quantity: 2 },
      { id: "ase_seat_1", quantity: 1 },
    ],
    markup: {
      ratePercent: 10,
      fixedAmount: 1,
    },
  })

  expect(result.netTotal).toBe(70)
  expect(result.sellTotal).toBe(80)
  expect(result.lines).toHaveLength(2)
})
