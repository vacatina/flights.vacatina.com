import { describe, expect, test } from "vitest"

import {
  areVisaApplicationPricesEquivalent,
  type VisaApplicationPricingSnapshot,
} from "@/modules/visa-assistance/applications/domain"

const baseSnapshot: VisaApplicationPricingSnapshot = {
  processingFee: null,
  governmentFee: null,
  totalSellMoney: { amount: "10000", currency: "USD", scale: 2 },
  pricedAt: "2026-09-11T00:00:00.000Z",
}

describe("visa application pricing snapshots", () => {
  test("ignores timestamp-only refreshes", () => {
    expect(
      areVisaApplicationPricesEquivalent(baseSnapshot, {
        ...baseSnapshot,
        pricedAt: "2026-09-11T00:05:00.000Z",
      })
    ).toBe(true)
  })

  test("detects a changed estimated amount", () => {
    expect(
      areVisaApplicationPricesEquivalent(baseSnapshot, {
        ...baseSnapshot,
        totalSellMoney: { amount: "11000", currency: "USD", scale: 2 },
      })
    ).toBe(false)
  })

  test("ignores JSONB object-key ordering", () => {
    const databaseSnapshot = JSON.parse(
      JSON.stringify({
        pricedAt: baseSnapshot.pricedAt,
        totalSellMoney: {
          scale: 2,
          currency: "USD",
          amount: "10000",
        },
        governmentFee: null,
        processingFee: null,
      })
    ) as VisaApplicationPricingSnapshot

    expect(
      areVisaApplicationPricesEquivalent(baseSnapshot, databaseSnapshot)
    ).toBe(true)
  })
})
