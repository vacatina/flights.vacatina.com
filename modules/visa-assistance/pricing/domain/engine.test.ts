import { describe, expect, test } from "vitest"

import { serializeMoney } from "@/modules/currency/domain"
import {
  addVisaMoney,
  matchVisaPricingRule,
  parseVisaAdjustment,
  priceVisaFee,
  type VisaPricingContext,
  type VisaPricingRule,
} from "@/modules/visa-assistance/pricing/domain"

const now = new Date("2026-09-10T10:00:00.000Z")
const processingContext: VisaPricingContext = {
  nationalityCode: "LK",
  destinationCode: "AE",
  visaTypeId: "42",
  providerProductId: "10139",
  feeComponent: "processing_fee",
  sourceCurrency: "USD",
}

describe("visa pricing rule matching", () => {
  test("prefers the most specific rule before priority", () => {
    const match = matchVisaPricingRule(
      processingContext,
      [
        createRule({ id: "global", priority: 100 }),
        createRule({
          id: "combination",
          priority: 1,
          nationalityCode: "LK",
          destinationCode: "AE",
          visaTypeId: "42",
        }),
      ],
      now
    )

    expect(match?.rule.id).toBe("combination")
    expect(match?.specificity).toBe(3)
  })

  test("skips fixed rules in a different source currency", () => {
    const match = matchVisaPricingRule(
      processingContext,
      [
        createRule({
          id: "fixed-lkr",
          adjustmentType: "fixed",
          adjustmentAmount: "100000",
          adjustmentScale: 2,
          adjustmentCurrency: "LKR",
        }),
        createRule({ id: "percent-usd" }),
      ],
      now
    )

    expect(match?.rule.id).toBe("percent-usd")
  })
})

describe("visa fee pricing", () => {
  test("calculates percentage markup with exact minor-unit rounding", () => {
    const rule = createRule({ adjustmentAmount: "100000", adjustmentScale: 4 })
    const match = { rule, specificity: 0 }
    const priced = priceVisaFee(
      serializeMoney("70.99", "USD"),
      processingContext,
      match
    )

    expect(priced.sourceMoney.amount).toBe("7099")
    expect(priced.markupMoney.amount).toBe("710")
    expect(priced.sellMoney.amount).toBe("7809")
  })

  test("adds a fixed markup in the source currency", () => {
    const rule = createRule({
      adjustmentType: "fixed",
      adjustmentAmount: "500",
      adjustmentScale: 2,
      adjustmentCurrency: "USD",
    })
    const priced = priceVisaFee(
      serializeMoney("70.99", "USD"),
      processingContext,
      { rule, specificity: 0 }
    )

    expect(priced.markupMoney.amount).toBe("500")
    expect(priced.sellMoney.amount).toBe("7599")
  })

  test("passes through safely when no rule matches", () => {
    const priced = priceVisaFee(
      serializeMoney("110", "USD"),
      { ...processingContext, feeComponent: "government_fee" },
      null
    )

    expect(priced.markupMoney.amount).toBe("0")
    expect(priced.sellMoney).toEqual(priced.sourceMoney)
  })

  test("adds fee totals only when currencies match", () => {
    expect(
      addVisaMoney(serializeMoney("10", "USD"), serializeMoney("5", "USD"))
    ).toMatchObject({ amount: "1500", currency: "USD", scale: 2 })
    expect(
      addVisaMoney(serializeMoney("10", "USD"), serializeMoney("5", "EUR"))
    ).toBeNull()
  })

  test("normalizes safe percentage and fixed admin input", () => {
    expect(parseVisaAdjustment({ type: "percent", value: "12.5" })).toEqual({
      amount: "125000",
      scale: 4,
      currency: null,
    })
    expect(
      parseVisaAdjustment({ type: "fixed", value: "5.25", currency: "usd" })
    ).toEqual({ amount: "525", scale: 2, currency: "USD" })
  })
})

function createRule(overrides: Partial<VisaPricingRule> = {}): VisaPricingRule {
  return {
    id: "rule",
    name: "Default processing markup",
    enabled: true,
    priority: 0,
    feeComponent: "processing_fee",
    adjustmentType: "percent",
    adjustmentAmount: "100000",
    adjustmentScale: 4,
    adjustmentCurrency: null,
    nationalityCode: null,
    destinationCode: null,
    visaTypeId: null,
    providerProductId: null,
    activeFrom: null,
    activeTo: null,
    createdBy: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
