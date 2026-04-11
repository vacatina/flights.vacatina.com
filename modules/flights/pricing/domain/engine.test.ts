import { expect, test } from "vitest"

import { matchRule, priceOffer, roundToMinorUnit } from "@/modules/flights/pricing/domain"
import type { PricingRule } from "@/modules/flights/pricing/domain"

const now = new Date("2026-04-11T12:00:00.000Z")

test("matchRule resolves by specificity first", () => {
  const context = {
    journeyType: "return" as const,
    originIata: "CMB",
    destinationIata: "DXB",
    airlineIata: "QR",
    cabinClass: "economy",
  }

  const match = matchRule(
    context,
    [
      createRule({
        id: "rule_global",
        priority: 100,
      }),
      createRule({
        id: "rule_route_airline",
        priority: 10,
        originIata: "CMB",
        destinationIata: "DXB",
        airlineIata: "QR",
      }),
    ],
    now
  )

  expect(match?.rule.id).toBe("rule_route_airline")
  expect(match?.specificity).toBe(3)
})

test("matchRule resolves by priority then updatedAt", () => {
  const context = {
    journeyType: "one_way" as const,
    originIata: "DXB",
    destinationIata: "SFO",
    airlineIata: "AA",
    cabinClass: "business",
  }

  const first = createRule({
    id: "rule_1",
    priority: 10,
    journeyType: "one_way",
    updatedAt: "2026-04-10T00:00:00.000Z",
  })
  const second = createRule({
    id: "rule_2",
    priority: 10,
    journeyType: "one_way",
    updatedAt: "2026-04-11T00:00:00.000Z",
  })

  const match = matchRule(context, [first, second], now)

  expect(match?.rule.id).toBe("rule_2")
})

test("priceOffer supports percent and fixed adjustments", () => {
  const percentPrice = priceOffer(
    200,
    "USD",
    {
      rule: createRule({
        id: "rule_percent",
        adjustmentType: "percent",
        adjustmentValue: 10,
      }),
      specificity: 1,
    }
  )
  const fixedPrice = priceOffer(
    200,
    "USD",
    {
      rule: createRule({
        id: "rule_fixed",
        adjustmentType: "fixed",
        adjustmentValue: 25,
      }),
      specificity: 1,
    }
  )

  expect(percentPrice.sellAmount).toBe(220)
  expect(fixedPrice.sellAmount).toBe(225)
})

test("priceOffer passes through when no rule matches", () => {
  const priced = priceOffer(317.801, "USD", null)

  expect(priced.netAmount).toBe(317.8)
  expect(priced.sellAmount).toBe(317.8)
  expect(priced.appliedRuleId).toBeNull()
})

test("roundToMinorUnit respects currency minor units", () => {
  expect(roundToMinorUnit(100.6, "JPY")).toBe(101)
  expect(roundToMinorUnit(100.1236, "BHD")).toBe(100.124)
  expect(roundToMinorUnit(100.126, "USD")).toBe(100.13)
})

function createRule(
  overrides: Partial<{
    id: string
    priority: number
    adjustmentType: "percent" | "fixed"
    adjustmentValue: number
    activeFrom: string | null
    activeTo: string | null
    journeyType: "one_way" | "return" | null
    originIata: string | null
    destinationIata: string | null
    airlineIata: string | null
    cabinClass: string | null
    updatedAt: string
  }> = {}
): PricingRule {
  return {
    id: overrides.id ?? "rule",
    name: "Rule",
    enabled: true,
    priority: overrides.priority ?? 0,
    adjustmentType: overrides.adjustmentType ?? "percent",
    adjustmentValue: overrides.adjustmentValue ?? 0,
    activeFrom: overrides.activeFrom
      ? new Date(overrides.activeFrom)
      : new Date("2026-01-01T00:00:00.000Z"),
    activeTo: overrides.activeTo
      ? new Date(overrides.activeTo)
      : new Date("2026-12-31T23:59:59.999Z"),
    journeyType: overrides.journeyType ?? null,
    originIata: overrides.originIata ?? null,
    destinationIata: overrides.destinationIata ?? null,
    airlineIata: overrides.airlineIata ?? null,
    cabinClass: overrides.cabinClass ?? null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt)
      : new Date("2026-01-01T00:00:00.000Z"),
  }
}
