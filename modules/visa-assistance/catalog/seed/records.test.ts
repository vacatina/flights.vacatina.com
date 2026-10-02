import { describe, expect, it } from "vitest"
import { VISA_SEED_LISTINGS } from "./listings"
import { createSeedRecord } from "./records"

describe("development visa seed", () => {
  const now = new Date("2026-10-02T00:00:00Z")
  it("creates tourism and business options for three routes with exact prices", () => {
    const records = VISA_SEED_LISTINGS.map((input) =>
      createSeedRecord(input, now)
    )
    expect(records.map(({ listing }) => listing.destinationCode)).toEqual([
      "IN",
      "SG",
      "AE",
      "IN",
      "SG",
      "AE",
    ])
    expect(records.map(({ listing }) => listing.priceMinor)).toEqual([
      "7500",
      "9500",
      "14500",
      "11000",
      "13500",
      "19500",
    ])
    for (const { listing, documents } of records) {
      expect(listing.nationalityCode).toBe("LK")
      expect(listing.status).toBe("published")
      expect(listing.shortSummary).toContain("Development sample")
      expect(listing.additionalNotes).toContain(
        "not verified visa requirements"
      )
      expect(documents.filter((document) => document.required)).toHaveLength(
        listing.code === "BUSINESS" ? 3 : 2
      )
      expect(
        documents.every((document) => document.listingId === listing.id)
      ).toBe(true)
      expect(listing).not.toHaveProperty("price")
      expect(listing).not.toHaveProperty("governmentFeeMinor")
      expect(listing).not.toHaveProperty("processingFeeMinor")
    }
  })
  it("keeps each route's options and document requirements independent", () => {
    for (const destination of ["IN", "SG", "AE"]) {
      const options = VISA_SEED_LISTINGS.filter(
        (input) => input.destinationCode === destination
      ).map((input) => createSeedRecord(input, now))
      expect(options.map(({ listing }) => listing.code)).toEqual([
        "TOURIST",
        "BUSINESS",
      ])
      expect(options[0].listing.id).not.toBe(options[1].listing.id)
      expect(options[0].listing.priceMinor).not.toBe(
        options[1].listing.priceMinor
      )
      const invitation = options[1].documents.find(
        (document) => document.label === "Business invitation letter"
      )
      expect(invitation).toMatchObject({
        required: true,
        scope: "per_application",
      })
      expect(
        options[0].documents.some(
          (document) => document.label === "Business invitation letter"
        )
      ).toBe(false)
    }
  })
  it("uses deterministic unique identifiers for safe reruns", () => {
    const first = VISA_SEED_LISTINGS.map((input) =>
      createSeedRecord(input, now)
    )
    const second = VISA_SEED_LISTINGS.map((input) =>
      createSeedRecord(input, now)
    )
    expect(first).toEqual(second)
    const ids = first.flatMap(({ listing, documents }) => [
      listing.id,
      ...documents.map((document) => document.id),
    ])
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-f0-9-]{36}$/.test(id!))).toBe(true)
  })
})
