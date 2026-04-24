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
    step: "traveler",
    status: undefined,
    sessionId: undefined,
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
    step: "traveler",
    status: undefined,
    sessionId: undefined,
  })

  expect(params.toString()).toContain("offer=off_1")
  expect(params.toString()).toContain("selected=off_partial_1%2Coff_partial_2")
  expect(params.toString()).toContain("quote=pqt_1")
  expect(params.toString()).not.toContain("step=")
})

test("parseCheckoutUrlState defaults to traveler step when missing", () => {
  const result = parseCheckoutUrlState({
    offer: "off_1",
    selected: "off_partial_1,off_partial_2",
    quote: "pqt_1",
  })

  expect(result.step).toBe("traveler")
})

test("parseCheckoutUrlState coerces invalid step to traveler", () => {
  const result = parseCheckoutUrlState({
    offer: "off_1",
    selected: "off_partial_1,off_partial_2",
    quote: "pqt_1",
    step: "invalid-step",
  })

  expect(result.step).toBe("traveler")
})

test("toCheckoutUrlSearchParams includes step when not traveler", () => {
  const params = toCheckoutUrlSearchParams({
    offerId: "off_1",
    selectedPartialOffers: ["off_partial_1", "off_partial_2"],
    quoteId: "pqt_1",
    step: "pay",
    status: undefined,
    sessionId: undefined,
  })

  expect(params.get("step")).toBe("pay")
})

test("parseCheckoutUrlState parses status/session when valid", () => {
  const result = parseCheckoutUrlState({
    offer: "off_1",
    selected: "off_partial_1,off_partial_2",
    quote: "pqt_1",
    step: "pay",
    status: "processing",
    session: "chs_1",
  })

  expect(result.status).toBe("processing")
  expect(result.sessionId).toBe("chs_1")
})

test("parseCheckoutUrlState ignores invalid status/session", () => {
  const result = parseCheckoutUrlState({
    offer: "off_1",
    selected: "off_partial_1,off_partial_2",
    quote: "pqt_1",
    status: "invalid-status",
    session: "   ",
  })

  expect(result.status).toBeUndefined()
  expect(result.sessionId).toBeUndefined()
})

test("toCheckoutUrlSearchParams serializes status/session when provided", () => {
  const params = toCheckoutUrlSearchParams({
    offerId: "off_1",
    selectedPartialOffers: ["off_partial_1"],
    quoteId: "pqt_1",
    step: "pay",
    status: "success",
    sessionId: "chs_1",
  })

  expect(params.get("status")).toBe("success")
  expect(params.get("session")).toBe("chs_1")
})
