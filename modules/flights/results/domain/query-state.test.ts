import { expect, test } from "vitest"

import {
  parseResultsUrlState,
  toResultsUrlSearchParams,
} from "@/modules/flights/results/domain"

test("parseResultsUrlState returns defaults for empty query", () => {
  const state = parseResultsUrlState({})

  expect(state).toEqual({
    leg: 0,
    selected: [],
    sort: "least_expensive",
    stops: "any",
    takeoffFrom: 0,
    takeoffTo: 1439,
    landingFrom: 0,
    landingTo: 1439,
  })
})

test("parseResultsUrlState parses custom values", () => {
  const state = parseResultsUrlState({
    leg: "1",
    selected: "off_1,off_2",
    sort: "shortest_duration",
    stops: "max_1",
    airline: "Air India",
    flightNumber: "AI0278",
    takeoffFrom: "360",
    takeoffTo: "780",
    landingFrom: "600",
    landingTo: "1200",
    after: "cursor_1",
  })

  expect(state).toEqual({
    leg: 1,
    selected: ["off_1", "off_2"],
    sort: "shortest_duration",
    stops: "max_1",
    airline: "Air India",
    flightNumber: "AI0278",
    takeoffFrom: 360,
    takeoffTo: 780,
    landingFrom: 600,
    landingTo: 1200,
    after: "cursor_1",
  })
})

test("toResultsUrlSearchParams serializes state", () => {
  const params = toResultsUrlSearchParams({
    leg: 1,
    selected: ["off_1", "off_2"],
    sort: "least_expensive",
    stops: "any",
    airline: "Air India",
    flightNumber: "AI0278",
    takeoffFrom: 0,
    takeoffTo: 1439,
    landingFrom: 0,
    landingTo: 1439,
    after: "cursor_1",
  })

  expect(params.get("selected")).toBe("off_1,off_2")
  expect(params.get("airline")).toBe("Air India")
  expect(params.get("after")).toBe("cursor_1")
})

test("parseResultsUrlState preserves valid fields when one field is invalid", () => {
  const state = parseResultsUrlState({
    leg: "1",
    selected: "off_1,off_2",
    sort: "shortest_duration",
    stops: "max_1",
    takeoffFrom: "360",
    takeoffTo: "invalid",
    landingFrom: "600",
    landingTo: "1200",
  })

  expect(state).toEqual({
    leg: 1,
    selected: ["off_1", "off_2"],
    sort: "shortest_duration",
    stops: "max_1",
    takeoffFrom: 360,
    takeoffTo: 1439,
    landingFrom: 600,
    landingTo: 1200,
  })
})

test("parseResultsUrlState defaults only invalid range endpoint when range is reversed", () => {
  const state = parseResultsUrlState({
    takeoffFrom: "900",
    takeoffTo: "300",
    landingFrom: "400",
    landingTo: "1000",
    sort: "most_expensive",
  })

  expect(state).toEqual({
    leg: 0,
    selected: [],
    sort: "most_expensive",
    stops: "any",
    takeoffFrom: 900,
    takeoffTo: 1439,
    landingFrom: 400,
    landingTo: 1000,
  })
})
