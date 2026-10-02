import { describe, expect, it } from "vitest"
import { applicationFixture } from "../testing/application-fixture"
import {
  createApplicationPricing,
  areVisaApplicationPricesEquivalent,
} from "./pricing-snapshot"
import { visaListingSnapshotSchema } from "./listing-snapshot"

describe("frozen manual visa estimates", () => {
  it("multiplies both exact fees by traveler count", () => {
    const snapshot = applicationFixture().application.listingSnapshot
    const pricing = createApplicationPricing(snapshot, 3)
    expect(pricing.governmentFee.amount).toBe("7500")
    expect(pricing.processingFee.amount).toBe("3705")
    expect(pricing.totalMoney.amount).toBe("11205")
    expect(pricing.travelerCount).toBe(3)
  })
  it("compares amounts without treating time as a price change", () => {
    const snapshot = applicationFixture().application.listingSnapshot
    expect(
      areVisaApplicationPricesEquivalent(
        createApplicationPricing(snapshot, 1, "2026-09-30T00:00:00Z"),
        createApplicationPricing(snapshot, 1, "2026-10-01T00:00:00Z")
      )
    ).toBe(true)
    expect(
      areVisaApplicationPricesEquivalent(
        createApplicationPricing(snapshot, 1),
        createApplicationPricing(snapshot, 2)
      )
    ).toBe(false)
  })
  it("supports zero fees and rejects invalid counts and snapshots", () => {
    const snapshot = applicationFixture().application.listingSnapshot
    expect(
      createApplicationPricing(
        { ...snapshot, governmentFeeMinor: "0", processingFeeMinor: "0" },
        2
      ).totalMoney.amount
    ).toBe("0")
    for (const count of [0, 11, 1.5, NaN])
      expect(() => createApplicationPricing(snapshot, count)).toThrow()
    expect(
      visaListingSnapshotSchema.safeParse({
        ...snapshot,
        governmentFeeMinor: "-1",
      }).success
    ).toBe(false)
    expect(
      visaListingSnapshotSchema.safeParse({
        ...snapshot,
        documents: [snapshot.documents[0], snapshot.documents[0]],
      }).success
    ).toBe(false)
  })
})
