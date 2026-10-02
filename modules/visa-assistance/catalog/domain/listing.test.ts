import { describe, expect, it } from "vitest"

import {
  getListingPublishIssues,
  listingFeeDecimal,
  parseVisaListingFees,
  visaListingInputSchema,
} from "./listing"

const draft = {
  nationalityCode: "lk",
  destinationCode: "in",
  code: "tourist-evisa",
  documents: [
    {
      label: " Passport bio page ",
      required: true,
      scope: "per_traveler" as const,
    },
  ],
}

describe("visa listing catalog validation", () => {
  it("normalizes route identity and ordered document copy", () => {
    const result = visaListingInputSchema.parse(draft)
    expect(result.nationalityCode).toBe("LK")
    expect(result.destinationCode).toBe("IN")
    expect(result.code).toBe("TOURIST-EVISA")
    expect(result.documents[0].label).toBe("Passport bio page")
  })

  it("rejects unknown countries and identical routes", () => {
    expect(() =>
      visaListingInputSchema.parse({ ...draft, nationalityCode: "ZZ" })
    ).toThrow()
    expect(() =>
      visaListingInputSchema.parse({ ...draft, destinationCode: "LK" })
    ).toThrow()
  })

  it("stores exact minor units, including zero", () => {
    const input = visaListingInputSchema.parse({
      ...draft,
      feeCurrency: "USD",
      price: "12.35",
    })
    expect(parseVisaListingFees(input)).toEqual({
      feeCurrency: "USD",
      priceMinor: "1235",
    })
    expect(listingFeeDecimal("1235", "USD")).toBe("12.35")
    expect(parseVisaListingFees({ ...input, price: "0" }).priceMinor).toBe("0")
  })

  it("rejects silent rounding and negative fees", () => {
    const base = { ...draft, feeCurrency: "USD", price: "1.001" }
    expect(() =>
      parseVisaListingFees(visaListingInputSchema.parse(base))
    ).toThrow()
    expect(() =>
      parseVisaListingFees(
        visaListingInputSchema.parse({ ...base, price: "-1" })
      )
    ).toThrow()
  })

  it("requires complete content and explicit checklist review to publish", () => {
    const issues = getListingPublishIssues({
      title: "India Tourist eVisa",
      shortSummary: "",
      fullDescription: "Details",
      feeCurrency: "USD",
      priceMinor: "0",
      documentsReviewed: false,
    })
    expect(issues).toEqual([
      "Add a short summary",
      "Review the document checklist",
    ])
    expect(
      getListingPublishIssues({
        title: "India Tourist eVisa",
        shortSummary: "Summary",
        fullDescription: "Details",
        feeCurrency: "USD",
        priceMinor: "0",
        documentsReviewed: true,
      })
    ).toEqual([])
  })
})
