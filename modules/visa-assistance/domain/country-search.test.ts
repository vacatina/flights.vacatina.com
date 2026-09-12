import { describe, expect, it } from "vitest"

import { searchVisaCountries } from "./country-search"
import { visaCountries } from "./countries"

describe("searchVisaCountries", () => {
  it("puts a country name prefix at the top", () => {
    const results = searchVisaCountries(visaCountries, "sri")

    expect(results[0]?.code).toBe("LK")
  })

  it("finds and prioritizes exact country codes", () => {
    const results = searchVisaCountries(visaCountries, "lk")

    expect(results[0]?.name).toBe("Sri Lanka")
  })

  it("supports familiar country aliases", () => {
    expect(searchVisaCountries(visaCountries, "uae")[0]?.code).toBe("AE")
    expect(searchVisaCountries(visaCountries, "south korea")[0]?.code).toBe(
      "KR"
    )
  })

  it("returns an empty list when nothing matches", () => {
    expect(searchVisaCountries(visaCountries, "not-a-country")).toEqual([])
  })
})
