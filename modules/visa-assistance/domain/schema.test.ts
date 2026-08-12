import { describe, expect, test } from "vitest"

import { countryCodeSchema, visaSearchSchema } from "./schema"

describe("visa search schema", () => {
  test("normalizes ISO alpha-2 country codes", () => {
    expect(countryCodeSchema.parse(" lk ")).toBe("LK")
  })

  test("rejects malformed country codes", () => {
    expect(countryCodeSchema.safeParse("LKA").success).toBe(false)
  })

  test("requires different passport and destination countries", () => {
    const result = visaSearchSchema.safeParse({
      nationality: "US",
      destination: "US",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["destination"])
    }
  })
})
