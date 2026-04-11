import type {
  MatchedPricingRule,
  PricedAmount,
  PricingContext,
  PricingRule,
} from "@/modules/flights/pricing/domain/types"

const ZERO_MINOR_UNIT_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

const THREE_MINOR_UNIT_CURRENCIES = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"])

export function matchRule(
  context: PricingContext,
  rules: readonly PricingRule[],
  now: Date = new Date()
): MatchedPricingRule | null {
  const normalizedContext = normalizeContext(context)

  const ranked = rules
    .filter((rule) => rule.enabled)
    .filter((rule) => isWithinActiveWindow(rule, now))
    .filter((rule) => matchesScope(rule, normalizedContext))
    .map((rule) => ({
      rule,
      specificity: scoreSpecificity(rule),
    }))
    .sort((left, right) => compareRuleRank(left, right))

  return ranked[0] ?? null
}

export function priceOffer(
  netAmount: number,
  currency: string,
  matchedRule: MatchedPricingRule | null
): PricedAmount {
  const normalizedCurrency = normalizeCurrency(currency)
  const safeNet = Number.isFinite(netAmount) ? Math.max(0, netAmount) : 0
  const roundedNet = roundToMinorUnit(safeNet, normalizedCurrency)

  if (!matchedRule) {
    return {
      currency: normalizedCurrency,
      netAmount: roundedNet,
      sellAmount: roundedNet,
      appliedRuleId: null,
      appliedRuleSpecificity: null,
    }
  }

  const { adjustmentType, adjustmentValue } = matchedRule.rule
  const safeAdjustmentValue = Number.isFinite(adjustmentValue)
    ? adjustmentValue
    : 0
  const adjusted =
    adjustmentType === "percent"
      ? safeNet + safeNet * (safeAdjustmentValue / 100)
      : safeNet + safeAdjustmentValue

  return {
    currency: normalizedCurrency,
    netAmount: roundedNet,
    sellAmount: roundToMinorUnit(Math.max(0, adjusted), normalizedCurrency),
    appliedRuleId: matchedRule.rule.id,
    appliedRuleSpecificity: matchedRule.specificity,
  }
}

export function roundToMinorUnit(amount: number, currency: string) {
  const digits = currencyMinorUnit(currency)
  const factor = 10 ** digits
  return Math.round(amount * factor) / factor
}

export function currencyMinorUnit(currency: string) {
  const normalized = normalizeCurrency(currency)

  if (ZERO_MINOR_UNIT_CURRENCIES.has(normalized)) {
    return 0
  }

  if (THREE_MINOR_UNIT_CURRENCIES.has(normalized)) {
    return 3
  }

  return 2
}

function compareRuleRank(left: MatchedPricingRule, right: MatchedPricingRule) {
  if (left.specificity !== right.specificity) {
    return right.specificity - left.specificity
  }

  if (left.rule.priority !== right.rule.priority) {
    return right.rule.priority - left.rule.priority
  }

  const updatedAtDiff = right.rule.updatedAt.getTime() - left.rule.updatedAt.getTime()

  if (updatedAtDiff !== 0) {
    return updatedAtDiff
  }

  return right.rule.id.localeCompare(left.rule.id)
}

function scoreSpecificity(rule: PricingRule) {
  const scopedFields = [
    rule.journeyType,
    rule.originIata,
    rule.destinationIata,
    rule.airlineIata,
    rule.cabinClass,
  ]

  return scopedFields.reduce(
    (count, value) => (value === null || value === "" ? count : count + 1),
    0
  )
}

function isWithinActiveWindow(rule: PricingRule, now: Date) {
  if (rule.activeFrom && rule.activeFrom.getTime() > now.getTime()) {
    return false
  }

  if (rule.activeTo && rule.activeTo.getTime() < now.getTime()) {
    return false
  }

  return true
}

function matchesScope(rule: PricingRule, context: PricingContext) {
  if (rule.journeyType && rule.journeyType !== context.journeyType) {
    return false
  }

  if (rule.originIata && normalizeIata(rule.originIata) !== context.originIata) {
    return false
  }

  if (
    rule.destinationIata &&
    normalizeIata(rule.destinationIata) !== context.destinationIata
  ) {
    return false
  }

  if (rule.airlineIata && normalizeIata(rule.airlineIata) !== context.airlineIata) {
    return false
  }

  if (
    rule.cabinClass &&
    normalizeCabinClass(rule.cabinClass) !== context.cabinClass
  ) {
    return false
  }

  return true
}

function normalizeContext(context: PricingContext): PricingContext {
  return {
    journeyType: context.journeyType,
    originIata: normalizeIata(context.originIata),
    destinationIata: normalizeIata(context.destinationIata),
    airlineIata: normalizeIata(context.airlineIata),
    cabinClass: normalizeCabinClass(context.cabinClass),
  }
}

function normalizeIata(value: string) {
  return value.trim().toUpperCase()
}

function normalizeCabinClass(value: string) {
  return value.trim().toLowerCase()
}

function normalizeCurrency(currency: string) {
  const normalized = currency.trim().toUpperCase()

  return normalized || "USD"
}
