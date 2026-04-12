import { expect, test } from "vitest"

import {
  parseCheckoutUrlState,
  toCheckoutUrlSearchParams,
} from "@/modules/flights/checkout/domain/query-state"

test("parseCheckoutUrlState parses valid query", () => {
  const result = parseCheckoutUrlState({
    offer: "off_1",
    selected: "off_partial_1,off_partial_2",
    quote: "pqt_1",
  })

  expect(result).toEqual({
    offerId: "off_1",
    selectedPartialOffers: ["off_partial_1", "off_partial_2"],
    quoteId: "pqt_1",
  })
})

test("parseCheckoutUrlState rejects invalid query", () => {
  expect(() =>
    parseCheckoutUrlState({
      offer: "off_1",
      quote: "pqt_1",
    })
  ).toThrow(/Invalid checkout link/)
})

test("toCheckoutUrlSearchParams serializes state", () => {
  const params = toCheckoutUrlSearchParams({
    offerId: "off_1",
    selectedPartialOffers: ["off_partial_1", "off_partial_2"],
    quoteId: "pqt_1",
  })

  expect(params.toString()).toContain("offer=off_1")
  expect(params.toString()).toContain("selected=off_partial_1%2Coff_partial_2")
  expect(params.toString()).toContain("quote=pqt_1")
})
