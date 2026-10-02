import { describe, expect, it } from "vitest"
import { VISA_SEED_LISTINGS } from "./listings"
import { createSeedRecord } from "./records"

describe("development visa seed", () => {
  const now = new Date("2026-10-02T00:00:00Z")
  it("creates three complete published routes with one exact price", () => {
    const records = VISA_SEED_LISTINGS.map((input) =>
      createSeedRecord(input, now)
    )
    expect(records.map(({ listing }) => listing.destinationCode)).toEqual([
      "IN",
      "SG",
      "AE",
    ])
    expect(records.map(({ listing }) => listing.priceMinor)).toEqual([
      "7500",
      "9500",
      "14500",
    ])
    for (const { listing, documents } of records) {
      expect(listing.nationalityCode).toBe("LK")
      expect(listing.status).toBe("published")
      expect(listing.shortSummary).toContain("Development sample")
      expect(listing.additionalNotes).toContain(
        "not verified visa requirements"
      )
      expect(documents.filter((document) => document.required)).toHaveLength(2)
      expect(
        documents.every((document) => document.listingId === listing.id)
      ).toBe(true)
      expect(listing).not.toHaveProperty("price")
      expect(listing).not.toHaveProperty("governmentFeeMinor")
      expect(listing).not.toHaveProperty("processingFeeMinor")
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
