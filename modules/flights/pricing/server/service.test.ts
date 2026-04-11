import { afterEach, expect, test } from "vitest"
import type { Offer } from "@duffel/api/types"

import type {
  PricedQuoteRecord,
  PricingRule,
} from "@/modules/flights/pricing/domain"
import {
  getPricingMetricValue,
  resetPricingMetricsForTests,
} from "@/modules/flights/pricing/server/metrics"
import type {
  PricedQuoteRepository,
} from "@/modules/flights/pricing/server/quote-repository"
import type {
  PricingRuleRepository,
} from "@/modules/flights/pricing/server/rule-repository"
import {
  createPricedQuote,
  formatCurrencyAmount,
  getOfferPricingMap,
  summarizeOfferPricing,
  validatePricedQuote,
} from "@/modules/flights/pricing/server/service"

afterEach(() => {
  resetPricingMetricsForTests()
})

test("getOfferPricingMap applies matched rule and records metrics", async () => {
  const deps = createDeps({
    now: new Date("2026-04-11T00:00:00.000Z"),
    rules: [
      createRule({
        id: "rule_route",
        originIata: "CMB",
        destinationIata: "DXB",
        airlineIata: "QR",
        adjustmentType: "percent",
        adjustmentValue: 10,
      }),
    ],
  })

  const priced = await getOfferPricingMap([createOffer()], deps)

  expect(priced.off_1.sellAmount).toBe(110)
  expect(priced.off_1.appliedRuleId).toBe("rule_route")
  expect(getPricingMetricValue("pricing_rule_applied_total")).toBe(1)
})

test("getOfferPricingMap falls back to passthrough when no rule matches", async () => {
  const deps = createDeps({
    now: new Date("2026-04-11T00:00:00.000Z"),
    rules: [],
  })

  const priced = await getOfferPricingMap([createOffer()], deps)

  expect(priced.off_1.sellAmount).toBe(100)
  expect(priced.off_1.appliedRuleId).toBeNull()
  expect(getPricingMetricValue("pricing_passthrough_total")).toBe(1)
})

test("createPricedQuote and validatePricedQuote succeed for active quote", async () => {
  const deps = createDeps({
    now: new Date("2026-04-11T00:00:00.000Z"),
    rules: [],
  })

  const quote = await createPricedQuote(
    {
      partialOfferRequestId: "prq_1",
      offerId: "off_1",
      selectedPartialOffers: ["off_partial_1"],
      pricing: {
        offerId: "off_1",
        currency: "USD",
        netAmount: 100,
        sellAmount: 110,
        appliedRuleId: "rule_1",
        appliedRuleSpecificity: 2,
      },
    },
    deps
  )

  const validation = await validatePricedQuote(
    {
      quoteId: quote.id,
      partialOfferRequestId: "prq_1",
      offerId: "off_1",
      selectedPartialOffers: ["off_partial_1"],
    },
    deps
  )

  expect(validation.ok).toBe(true)
  expect(validation.quote?.sellAmount).toBe(110)
  expect(getPricingMetricValue("quote_create_total")).toBe(1)
})

test("validatePricedQuote expires stale quote", async () => {
  const deps = createDeps({
    now: new Date("2026-04-11T00:00:00.000Z"),
    rules: [],
  })

  const quote = await createPricedQuote(
    {
      partialOfferRequestId: "prq_1",
      offerId: "off_1",
      selectedPartialOffers: ["off_partial_1"],
      pricing: {
        offerId: "off_1",
        currency: "USD",
        netAmount: 100,
        sellAmount: 105,
        appliedRuleId: null,
        appliedRuleSpecificity: null,
      },
    },
    deps
  )

  const expiredDeps = {
    ...deps,
    now: () => new Date(quote.expiresAt.getTime() + 1),
  }

  const validation = await validatePricedQuote(
    {
      quoteId: quote.id,
      partialOfferRequestId: "prq_1",
      offerId: "off_1",
      selectedPartialOffers: ["off_partial_1"],
    },
    expiredDeps
  )

  expect(validation.ok).toBe(false)
  expect(validation.reason).toBe("expired")
  expect(getPricingMetricValue("quote_expired_total")).toBe(1)
})

test("formatCurrencyAmount respects currency minor units", () => {
  expect(formatCurrencyAmount(110, "JPY")).toContain("110")
  expect(formatCurrencyAmount(110, "JPY")).not.toContain(".")
  expect(formatCurrencyAmount(110.123, "BHD")).toContain("110.123")
})

test("summarizeOfferPricing does not aggregate mixed-currency totals", () => {
  const summary = summarizeOfferPricing({
    off_usd_1: {
      offerId: "off_usd_1",
      currency: "USD",
      netAmount: 100,
      sellAmount: 110,
      appliedRuleId: "rule_1",
      appliedRuleSpecificity: 1,
    },
    off_jpy_1: {
      offerId: "off_jpy_1",
      currency: "JPY",
      netAmount: 1000,
      sellAmount: 1100,
      appliedRuleId: "rule_1",
      appliedRuleSpecificity: 1,
    },
  })

  expect(summary.isMultiCurrency).toBe(true)
  expect(summary.totalNetAmount).toBeNull()
  expect(summary.totalSellAmount).toBeNull()
  expect(summary.totalMarkupAmount).toBeNull()
  expect(summary.currencies).toEqual(["JPY", "USD"])
  expect(summary.totalsByCurrency).toHaveLength(2)
})

function createDeps(input: { now: Date; rules: PricingRule[] }) {
  const quotes = new Map<string, PricedQuoteRecord>()

  const ruleRepository: PricingRuleRepository = {
    async listMatchingCandidates() {
      return input.rules
    },
  }

  const quoteRepository: PricedQuoteRepository = {
    async create(createInput) {
      const now = input.now
      const quote: PricedQuoteRecord = {
        id: createInput.id,
        partialOfferRequestId: createInput.partialOfferRequestId,
        offerId: createInput.offerId,
        selectedPartialOffers: createInput.selectedPartialOffers,
        ownerUserId: createInput.ownerUserId ?? null,
        ownerGuestId: createInput.ownerGuestId ?? null,
        ownerOrgId: createInput.ownerOrgId ?? null,
        currency: createInput.currency,
        netAmount: createInput.netAmount,
        sellAmount: createInput.sellAmount,
        appliedRuleId: createInput.appliedRuleId,
        appliedRuleSpecificity: null,
        status: createInput.status,
        expiresAt: createInput.expiresAt,
        createdAt: now,
        updatedAt: now,
      }

      quotes.set(quote.id, quote)
      return quote
    },
    async findById(quoteId) {
      return quotes.get(quoteId) ?? null
    },
    async updateStatus(quoteId, status) {
      const existing = quotes.get(quoteId)

      if (!existing) {
        return
      }

      quotes.set(quoteId, {
        ...existing,
        status,
        updatedAt: input.now,
      })
    },
  }

  return {
    now: () => input.now,
    ruleRepository,
    quoteRepository,
  }
}

function createRule(
  overrides: Partial<{
    id: string
    adjustmentType: "percent" | "fixed"
    adjustmentValue: number
    priority: number
    originIata: string | null
    destinationIata: string | null
    airlineIata: string | null
  }> = {}
): PricingRule {
  return {
    id: overrides.id ?? "rule_1",
    name: "Rule",
    enabled: true,
    priority: overrides.priority ?? 0,
    adjustmentType: overrides.adjustmentType ?? "percent",
    adjustmentValue: overrides.adjustmentValue ?? 0,
    activeFrom: new Date("2026-01-01T00:00:00.000Z"),
    activeTo: new Date("2026-12-31T23:59:59.999Z"),
    journeyType: null,
    originIata: overrides.originIata ?? null,
    destinationIata: overrides.destinationIata ?? null,
    airlineIata: overrides.airlineIata ?? null,
    cabinClass: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  }
}

function createOffer(): Offer {
  return {
    id: "off_1",
    owner: {
      id: "air_qr",
      iata_code: "QR",
      icao_code: "QTR",
      name: "Qatar Airways",
      logo_symbol_url: null,
      logo_lockup_url: null,
    },
    total_amount: "100.00",
    total_currency: "USD",
    slices: [
      {
        id: "sli_1",
        comparison_key: "cmp_1",
        origin: { iata_code: "CMB", name: "CMB" },
        destination: { iata_code: "DXB", name: "DXB" },
        origin_type: "airport",
        destination_type: "airport",
        duration: "PT4H00M",
        fare_brand_name: null,
        conditions: {
          change_before_departure: null,
          refund_before_departure: null,
        },
        ngs_shelf: null,
        segments: [
          {
            id: "seg_1",
            aircraft: { id: "arc_1", iata_code: "320", name: "Airbus A320" },
            arriving_at: "2026-04-11T16:00:00+04:00",
            destination_terminal: null,
            departing_at: "2026-04-11T12:00:00+05:30",
            origin_terminal: null,
            destination: { iata_code: "DXB", name: "DXB" },
            origin: { iata_code: "CMB", name: "CMB" },
            distance: "1000",
            duration: "PT4H00M",
            marketing_carrier: {
              id: "air_qr",
              iata_code: "QR",
              icao_code: "QTR",
              name: "Qatar Airways",
              logo_symbol_url: null,
              logo_lockup_url: null,
            },
            marketing_carrier_flight_number: "111",
            operating_carrier: {
              id: "air_qr",
              iata_code: "QR",
              icao_code: "QTR",
              name: "Qatar Airways",
              logo_symbol_url: null,
              logo_lockup_url: null,
            },
            operating_carrier_flight_number: "111",
            passengers: [
              {
                baggages: [],
                cabin_class: "economy",
                cabin_class_marketing_name: "Economy",
                passenger_id: "pas_1",
                fare_basis_code: "Y",
                cabin: null,
              },
            ],
            stops: [],
          },
        ],
      },
    ],
  } as unknown as Offer
}
