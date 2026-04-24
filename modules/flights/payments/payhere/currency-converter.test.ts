import { expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  convertToLkr,
  supportsPayHereConversion,
} from "@/modules/flights/payments/payhere/currency-converter"

test("convertToLkr applies static rate and default 3% buffer", () => {
  const result = convertToLkr({
    amount: 100,
    sourceCurrency: "USD",
  })

  expect(result.sourceCurrency).toBe("USD")
  expect(result.targetCurrency).toBe("LKR")
  expect(result.baseRate).toBe(320)
  expect(result.bufferPercent).toBe(3)
  expect(result.effectiveRate).toBe(329.6)
  expect(result.convertedAmount).toBe(32960)
})

test("convertToLkr clamps buffer range", () => {
  expect(
    convertToLkr({
      amount: 1,
      sourceCurrency: "USD",
      bufferPercent: -10,
    }).bufferPercent
  ).toBe(0)

  expect(
    convertToLkr({
      amount: 1,
      sourceCurrency: "USD",
      bufferPercent: 50,
    }).bufferPercent
  ).toBe(20)
})

test("convertToLkr throws for unsupported currency", () => {
  expect(() =>
    convertToLkr({
      amount: 100,
      sourceCurrency: "ZAR",
    })
  ).toThrow(/unavailable/i)
})

test("supportsPayHereConversion returns true only for configured currencies", () => {
  expect(supportsPayHereConversion("usd")).toBe(true)
  expect(supportsPayHereConversion("LKR")).toBe(true)
  expect(supportsPayHereConversion("ZAR")).toBe(false)
})
