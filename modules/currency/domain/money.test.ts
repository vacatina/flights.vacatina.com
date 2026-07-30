import { describe, expect, test } from "vitest"

import {
  CURRENCY_REGISTRY,
  convertMoney,
  decimalToScaledInteger,
  formatSerializedMoney,
  parseDisplayCurrency,
  serializeMoney,
  type SerializedFxSnapshot,
} from "@/modules/currency/domain"

const snapshot: SerializedFxSnapshot = {
  baseCurrency: "USD",
  rates: {
    USD: { amount: "1000000000000", scale: 12 },
    LKR: { amount: "300000000000000", scale: 12 },
    JPY: { amount: "150000000000000", scale: 12 },
  },
  providerUpdatedAt: "2026-07-30T00:00:00.000Z",
  fetchedAt: "2026-07-30T00:00:00.000Z",
  stale: false,
}

describe("currency registry", () => {
  test("contains the twelve ordered display currencies", () => {
    expect(CURRENCY_REGISTRY).toHaveLength(12)
    expect(CURRENCY_REGISTRY.map((currency) => currency.code)).toEqual([
      "LKR",
      "INR",
      "USD",
      "EUR",
      "GBP",
      "AUD",
      "CAD",
      "SGD",
      "AED",
      "SAR",
      "QAR",
      "JPY",
    ])
    expect(
      CURRENCY_REGISTRY.filter((currency) => currency.paymentSupported).map(
        (currency) => currency.code
      )
    ).toEqual(["USD", "EUR", "GBP", "AUD", "CAD", "SGD", "JPY"])
    expect(
      CURRENCY_REGISTRY.map(({ code, symbol, precision, sortOrder }) => ({
        code,
        symbol,
        precision,
        sortOrder,
      }))
    ).toEqual([
      { code: "LKR", symbol: "Rs", precision: 2, sortOrder: 10 },
      { code: "INR", symbol: "₹", precision: 2, sortOrder: 20 },
      { code: "USD", symbol: "$", precision: 2, sortOrder: 30 },
      { code: "EUR", symbol: "€", precision: 2, sortOrder: 40 },
      { code: "GBP", symbol: "£", precision: 2, sortOrder: 50 },
      { code: "AUD", symbol: "A$", precision: 2, sortOrder: 60 },
      { code: "CAD", symbol: "C$", precision: 2, sortOrder: 70 },
      { code: "SGD", symbol: "S$", precision: 2, sortOrder: 80 },
      { code: "AED", symbol: "د.إ", precision: 2, sortOrder: 90 },
      { code: "SAR", symbol: "ر.س", precision: 2, sortOrder: 100 },
      { code: "QAR", symbol: "ر.ق", precision: 2, sortOrder: 110 },
      { code: "JPY", symbol: "¥", precision: 0, sortOrder: 120 },
    ])
  })

  test("uses LKR for missing or invalid cookie values", () => {
    expect(parseDisplayCurrency(undefined)).toBe("LKR")
    expect(parseDisplayCurrency("XYZ")).toBe("LKR")
    expect(parseDisplayCurrency("INR")).toBe("INR")
  })
})

describe("exact money conversion", () => {
  test("parses decimal and scientific notation into scaled integers", () => {
    expect(decimalToScaledInteger("123.456", 2)).toBe(12346n)
    expect(decimalToScaledInteger("1.5e2", 2)).toBe(15000n)
  })

  test("converts USD to LKR with scaled bigint rates", () => {
    const converted = convertMoney(serializeMoney("500", "USD"), "LKR", snapshot)

    expect(converted).toEqual({
      amount: "15000000",
      currency: "LKR",
      scale: 2,
    })
  })

  test("rounds JPY to zero decimal places", () => {
    const converted = convertMoney(
      serializeMoney("1.01", "USD"),
      "JPY",
      snapshot
    )

    expect(converted).toEqual({
      amount: "152",
      currency: "JPY",
      scale: 0,
    })
  })

  test("formats large values without converting the amount to a number", () => {
    expect(
      formatSerializedMoney({
        amount: "900719925474099312345",
        currency: "USD",
        scale: 2,
      })
    ).toContain("9,007,199,254,740,993,123.45")
  })

  test("returns null when a source rate is unavailable", () => {
    expect(
      convertMoney(serializeMoney("10", "CHF"), "LKR", snapshot)
    ).toBeNull()
  })
})
