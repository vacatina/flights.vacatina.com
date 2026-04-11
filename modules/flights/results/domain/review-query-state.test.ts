import { expect, test } from "vitest"

import {
  parseReviewUrlState,
  toReviewUrlSearchParams,
} from "@/modules/flights/results/domain"

test("parseReviewUrlState parses selected and fare values", () => {
  const state = parseReviewUrlState({
    selected: "off_1, off_2",
    fare: ["fare_a", "fare_b"],
  })

  expect(state).toEqual({
    selected: ["off_1", "off_2"],
    fare: ["fare_a", "fare_b"],
  })
})

test("parseReviewUrlState supports repeated and csv fare params", () => {
  const state = parseReviewUrlState({
    selected: ["off_1", "off_2"],
    fare: ["fare_a,fare_b", "fare_c"],
  })

  expect(state).toEqual({
    selected: ["off_1", "off_2"],
    fare: ["fare_a", "fare_b", "fare_c"],
  })
})

test("parseReviewUrlState returns empty state for missing selected", () => {
  const state = parseReviewUrlState({
    fare: "fare_a",
  })

  expect(state).toEqual({
    selected: [],
    fare: [],
  })
})

test("toReviewUrlSearchParams serializes selected and repeated fare", () => {
  const params = toReviewUrlSearchParams({
    selected: ["off_1", "off_2"],
    fare: ["fare_a", "fare_b"],
  })

  expect(params.get("selected")).toBe("off_1,off_2")
  expect(params.getAll("fare")).toEqual(["fare_a", "fare_b"])
})
