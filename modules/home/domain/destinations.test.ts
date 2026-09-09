import { afterEach, describe, expect, it, vi } from "vitest"

import { destinations, destinationSearchHref } from "./destinations"
import { parseSearchPrefillToken } from "@/modules/flights/search/domain/prefill"

afterEach(() => vi.useRealTimers())

describe("destination search links", () => {
  it.each(destinations)(
    "prefills a valid future search for $city",
    (destination) => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-12-20T12:00:00Z"))
      const url = new URL(
        destinationSearchHref(destination),
        "https://example.com"
      )
      const values = parseSearchPrefillToken(url.searchParams.get("prefill"))
      expect(url.hash).toBe("#flight-search")
      expect(values?.slices[0].origin?.iataCode).toBe("CMB")
      expect(values?.slices[0].destination?.iataCode).toBe(destination.code)
      expect(values?.slices[0].departureDate).toBe("2027-01-19")
      expect(values?.passengers).toEqual({
        adults: 1,
        children: 0,
        childrenAges: [],
      })
    }
  )
})
