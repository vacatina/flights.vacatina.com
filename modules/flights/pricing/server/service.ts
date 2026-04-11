import { randomUUID } from "node:crypto"

import type { Offer } from "@duffel/api/types"

import { currencyMinorUnit, matchRule, priceOffer } from "@/modules/flights/pricing/domain"
import type {
  OfferPriceRecord,
  PricingContext,
  PricedQuoteRecord,
} from "@/modules/flights/pricing/domain"
import { getPricingServerConfig } from "@/modules/flights/pricing/server/config"
import {
  defaultPricedQuoteRepository,
  type PricedQuoteRepository,
} from "@/modules/flights/pricing/server/quote-repository"
import {
  incrementPricingMetric,
  type PricingMetricName,
} from "@/modules/flights/pricing/server/metrics"
import {
  defaultPricingRuleRepository,
  type PricingRuleRepository,
} from "@/modules/flights/pricing/server/rule-repository"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

interface PricingServiceDeps {
  now: () => Date
  ruleRepository: PricingRuleRepository
  quoteRepository: PricedQuoteRepository
}

interface CreatePricedQuoteInput {
  partialOfferRequestId: string
  offerId: string
  selectedPartialOffers: string[]
  ownerUserId?: string | null
  ownerGuestId?: string | null
  ownerOrgId?: string | null
  pricing: OfferPriceRecord
}

interface ValidatePricedQuoteInput {
  quoteId: string
  partialOfferRequestId: string
  offerId: string
  selectedPartialOffers: string[]
}

interface PricedQuoteValidationResult {
  ok: boolean
  quote: PricedQuoteRecord | null
  reason:
    | "not_found"
    | "not_active"
    | "expired"
    | "partial_offer_request_mismatch"
    | "offer_mismatch"
    | "selected_mismatch"
    | null
}

const defaultDeps: PricingServiceDeps = {
  now: () => new Date(),
  ruleRepository: defaultPricingRuleRepository,
  quoteRepository: defaultPricedQuoteRepository,
}

export async function getOfferPricingMap(
  offers: Offer[],
  deps: PricingServiceDeps = defaultDeps
): Promise<Record<string, OfferPriceRecord>> {
  if (offers.length === 0) {
    return {}
  }

  const now = deps.now()
  const rules = await deps.ruleRepository.listMatchingCandidates(now)
  const pricingByOfferId: Record<string, OfferPriceRecord> = {}

  for (const offer of offers) {
    const context = createPricingContextFromOffer(offer)
    const matchedRule = matchRule(context, rules, now)
    const priced = priceOffer(toOfferAmount(offer.total_amount), offer.total_currency, matchedRule)

    if (matchedRule) {
      incrementPricingMetric("pricing_rule_applied_total", {
        ruleId: matchedRule.rule.id,
        specificity: matchedRule.specificity,
        priority: matchedRule.rule.priority,
      })
      logFlightFlow("pricing.service", "rule_applied", {
        offerId: offer.id,
        ruleId: matchedRule.rule.id,
        specificity: matchedRule.specificity,
        priority: matchedRule.rule.priority,
        adjustmentType: matchedRule.rule.adjustmentType,
        adjustmentValue: matchedRule.rule.adjustmentValue,
        ...toPriceBreakdown(priced.netAmount, priced.sellAmount, priced.currency),
      })
    } else {
      incrementPricingMetric("pricing_passthrough_total", {
        offerId: offer.id,
      })
      logFlightFlow("pricing.service", "passthrough_applied", {
        offerId: offer.id,
        ...toPriceBreakdown(priced.netAmount, priced.sellAmount, priced.currency),
      })
    }

    pricingByOfferId[offer.id] = {
      offerId: offer.id,
      ...priced,
    }
  }

  const summary = summarizeOfferPricing(pricingByOfferId)
  logFlightFlow("pricing.service", "pricing_map_built", summary)

  return pricingByOfferId
}

export async function createPricedQuote(
  input: CreatePricedQuoteInput,
  deps: PricingServiceDeps = defaultDeps
): Promise<PricedQuoteRecord> {
  const now = deps.now()
  const config = getPricingServerConfig()
  const quoteId = createQuoteId()
  const expiresAt = new Date(now.getTime() + config.quoteTtlMs)

  const quote = await deps.quoteRepository.create({
    id: quoteId,
    partialOfferRequestId: input.partialOfferRequestId,
    offerId: input.offerId,
    selectedPartialOffers: normalizeSelected(input.selectedPartialOffers),
    ownerUserId: input.ownerUserId ?? null,
    ownerGuestId: input.ownerGuestId ?? null,
    ownerOrgId: input.ownerOrgId ?? null,
    currency: input.pricing.currency,
    netAmount: input.pricing.netAmount,
    sellAmount: input.pricing.sellAmount,
    appliedRuleId: input.pricing.appliedRuleId,
    status: "active",
    expiresAt,
  })

  incrementPricingMetric("quote_create_total", {
    quoteId,
    offerId: input.offerId,
  })
  logFlightFlow("pricing.service", "quote_created", {
    quoteId,
    offerId: input.offerId,
    partialOfferRequestId: input.partialOfferRequestId,
    selectedCount: input.selectedPartialOffers.length,
    ownerUserId: input.ownerUserId ?? null,
    ownerGuestId: input.ownerGuestId ?? null,
    expiresAt: quote.expiresAt.toISOString(),
    ...toPriceBreakdown(input.pricing.netAmount, input.pricing.sellAmount, input.pricing.currency),
  })

  return quote
}

export async function validatePricedQuote(
  input: ValidatePricedQuoteInput,
  deps: PricingServiceDeps = defaultDeps
): Promise<PricedQuoteValidationResult> {
  const quote = await deps.quoteRepository.findById(input.quoteId)

  if (!quote) {
    incrementPricingMetric("quote_validation_failed_total", {
      reason: "not_found",
      quoteId: input.quoteId,
    })
    return {
      ok: false,
      quote: null,
      reason: "not_found",
    }
  }

  if (quote.status !== "active") {
    incrementPricingMetric("quote_validation_failed_total", {
      reason: "not_active",
      quoteId: input.quoteId,
      status: quote.status,
    })
    return {
      ok: false,
      quote,
      reason: "not_active",
    }
  }

  if (quote.expiresAt.getTime() <= deps.now().getTime()) {
    await deps.quoteRepository.updateStatus(quote.id, "expired")
    incrementPricingMetric("quote_expired_total", {
      quoteId: quote.id,
    })
    incrementPricingMetric("quote_validation_failed_total", {
      reason: "expired",
      quoteId: quote.id,
    })
    logFlightFlow("pricing.service", "quote_expired", {
      quoteId: quote.id,
    })
    return {
      ok: false,
      quote: {
        ...quote,
        status: "expired",
      },
      reason: "expired",
    }
  }

  if (quote.partialOfferRequestId !== input.partialOfferRequestId) {
    return failQuoteValidation("partial_offer_request_mismatch", quote)
  }

  if (quote.offerId !== input.offerId) {
    return failQuoteValidation("offer_mismatch", quote)
  }

  const expectedSelected = normalizeSelected(input.selectedPartialOffers)

  if (!equalsArray(quote.selectedPartialOffers, expectedSelected)) {
    return failQuoteValidation("selected_mismatch", quote)
  }

  return {
    ok: true,
    quote,
    reason: null,
  }
}

export async function markPricedQuoteConsumed(
  quoteId: string,
  deps: PricingServiceDeps = defaultDeps
) {
  await deps.quoteRepository.updateStatus(quoteId, "consumed")
}

export function formatCurrencyAmount(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase()
  const digits = currencyMinorUnit(normalizedCurrency)

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount)
  } catch {
    return `${normalizedCurrency}${amount.toFixed(digits)}`
  }
}

export function createPricingContextFromOffer(offer: Offer): PricingContext {
  const firstSlice = offer.slices[0]
  const lastSlice = offer.slices[offer.slices.length - 1]
  const firstSegment = firstSlice?.segments[0]
  const firstPassenger = firstSegment?.passengers[0]

  return {
    journeyType: offer.slices.length > 1 ? "return" : "one_way",
    originIata: firstSlice?.origin.iata_code ?? "UNK",
    destinationIata: lastSlice?.destination.iata_code ?? "UNK",
    airlineIata: offer.owner.iata_code ?? "UNK",
    cabinClass: firstPassenger?.cabin_class ?? "economy",
  }
}

function failQuoteValidation(
  reason: Exclude<PricedQuoteValidationResult["reason"], null | "not_found" | "expired" | "not_active">,
  quote: PricedQuoteRecord
): PricedQuoteValidationResult {
  incrementPricingMetric("quote_validation_failed_total", {
    reason,
    quoteId: quote.id,
  })
  logFlightFlow("pricing.service", "quote_validation_failed", {
    reason,
    quoteId: quote.id,
  })
  return {
    ok: false,
    quote,
    reason,
  }
}

function toOfferAmount(value: string) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return parsed
}

function equalsArray(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

function createQuoteId() {
  return `pqt_${randomUUID().replaceAll("-", "")}`
}

function normalizeSelected(selected: string[]) {
  return selected
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function summarizeOfferPricing(pricingByOfferId: Record<string, OfferPriceRecord>) {
  const records = Object.values(pricingByOfferId)
  const totalsByCurrencyMap = new Map<
    string,
    {
      netAmount: number
      sellAmount: number
    }
  >()

  for (const record of records) {
    const current = totalsByCurrencyMap.get(record.currency) ?? {
      netAmount: 0,
      sellAmount: 0,
    }

    current.netAmount += record.netAmount
    current.sellAmount += record.sellAmount
    totalsByCurrencyMap.set(record.currency, current)
  }

  const totalsByCurrency = Array.from(totalsByCurrencyMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, totals]) => {
      const markupAmount = totals.sellAmount - totals.netAmount
      const markupPercent =
        totals.netAmount > 0
          ? Number(((markupAmount / totals.netAmount) * 100).toFixed(4))
          : null

      return {
        currency,
        netAmount: roundAmount(totals.netAmount),
        sellAmount: roundAmount(totals.sellAmount),
        markupAmount: roundAmount(markupAmount),
        markupPercent,
      }
    })

  const isMultiCurrency = totalsByCurrency.length > 1

  const singleCurrencyTotals = !isMultiCurrency ? totalsByCurrency[0] : null

  return {
    pricedOffersCount: records.length,
    isMultiCurrency,
    currencies: totalsByCurrency.map((totals) => totals.currency),
    totalsByCurrency,
    totalNetAmount: singleCurrencyTotals?.netAmount ?? null,
    totalSellAmount: singleCurrencyTotals?.sellAmount ?? null,
    totalMarkupAmount: singleCurrencyTotals?.markupAmount ?? null,
    averageMarkupPercent: singleCurrencyTotals?.markupPercent ?? null,
  }
}

function toPriceBreakdown(netAmount: number, sellAmount: number, currency: string) {
  const markupAmount = sellAmount - netAmount
  const markupPercent =
    netAmount > 0 ? Number(((markupAmount / netAmount) * 100).toFixed(4)) : null

  return {
    currency,
    netAmount: roundAmount(netAmount),
    sellAmount: roundAmount(sellAmount),
    markupAmount: roundAmount(markupAmount),
    markupPercent,
  }
}

function roundAmount(value: number) {
  return Number(value.toFixed(4))
}

export function logPricingCounterSnapshot(metricName: PricingMetricName, value: number) {
  logFlightFlow("pricing.metrics", "counter_snapshot", {
    metricName,
    value,
  })
}
