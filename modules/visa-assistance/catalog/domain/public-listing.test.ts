import { describe, expect, it } from "vitest"
import { listingFixture } from "../testing/listing-fixture"
import {
  publicListingFees,
  publicListingPath,
  toPublicVisaListing,
} from "./public-listing"

describe("public visa listing", () => {
  it("exposes only customer fields and a serializable review date", () => {
    const listing = toPublicVisaListing(listingFixture())
    expect(listing.reviewedAt).toBe("2026-09-30T00:00:00.000Z")
    expect(listing).not.toHaveProperty("createdBy")
    expect(listing).not.toHaveProperty("updatedBy")
    expect(listing).not.toHaveProperty("status")
    expect(publicListingPath(listing)).toBe(
      `/visa-assistance/LK/IN/${listing.id}`
    )
  })
  it("uses exact admin fees with no markup or floating point arithmetic", () => {
    const listing = toPublicVisaListing(
      listingFixture({
        governmentFeeMinor: "999999999999999999999999999999",
        processingFeeMinor: "1",
      })
    )
    expect(publicListingFees(listing).total).toEqual({
      currency: "USD",
      scale: 2,
      amount: "1000000000000000000000000000000",
    })
    expect(publicListingFees(listing).processing.amount).toBe("1")
  })
  it("supports zero fees and zero-decimal currencies", () => {
    const fees = publicListingFees(
      toPublicVisaListing(
        listingFixture({
          feeCurrency: "JPY",
          governmentFeeMinor: "0",
          processingFeeMinor: "1235",
        })
      )
    )
    expect(fees.government.amount).toBe("0")
    expect(fees.total).toEqual({ amount: "1235", currency: "JPY", scale: 0 })
  })
  it("does not manufacture a quote when published data lacks fees", () => {
    expect(() =>
      publicListingFees(
        toPublicVisaListing(listingFixture({ processingFeeMinor: null }))
      )
    ).toThrow("missing its fees")
  })
})
