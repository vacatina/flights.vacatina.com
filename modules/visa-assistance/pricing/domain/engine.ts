import {
  add,
  dinero,
  halfUp,
  multiply,
  toSnapshot,
  transformScale,
  type Dinero,
  type DineroCurrency,
} from "dinero.js/bigint"

import {
  decimalToScaledInteger,
  getCurrencyPrecision,
  type SerializedMoney,
} from "@/modules/currency/domain"
import type {
  MatchedVisaPricingRule,
  VisaFeePricing,
  VisaPricingContext,
  VisaPricingRule,
} from "@/modules/visa-assistance/pricing/domain/types"

const TEN = 10n
export const VISA_PERCENTAGE_SCALE = 4
export const MAX_VISA_MARKUP_PERCENT = 500

export function matchVisaPricingRule(
  context: VisaPricingContext,
  rules: readonly VisaPricingRule[],
  now: Date = new Date()
): MatchedVisaPricingRule | null {
  const normalizedContext = normalizeContext(context)

  return (
    rules
      .filter((rule) => rule.enabled)
      .filter((rule) => isWithinActiveWindow(rule, now))
      .filter((rule) => matchesContext(rule, normalizedContext))
      .map((rule) => ({ rule, specificity: scoreSpecificity(rule) }))
      .sort(compareRuleRank)[0] ?? null
  )
}

export function priceVisaFee(
  sourceMoney: SerializedMoney,
  context: VisaPricingContext,
  matchedRule: MatchedVisaPricingRule | null
): VisaFeePricing {
  const normalizedSource = normalizeMoney(sourceMoney)
  const source = toDinero(normalizedSource)
  const markup = matchedRule
    ? calculateMarkup(source, normalizedSource.currency, matchedRule.rule)
    : zeroDinero(normalizedSource.currency)
  const sell = add(source, markup)

  return {
    feeComponent: context.feeComponent,
    sourceMoney: fromDinero(source),
    markupMoney: fromDinero(markup),
    sellMoney: fromDinero(sell),
    appliedRuleId: matchedRule?.rule.id ?? null,
    appliedRuleName: matchedRule?.rule.name ?? null,
    appliedRuleSpecificity: matchedRule?.specificity ?? null,
  }
}

export function addVisaMoney(
  left: SerializedMoney | null,
  right: SerializedMoney | null
): SerializedMoney | null {
  if (!left) return right ? normalizeMoney(right) : null
  if (!right) return normalizeMoney(left)

  const leftCurrency = normalizeCurrency(left.currency)
  const rightCurrency = normalizeCurrency(right.currency)
  if (leftCurrency !== rightCurrency) return null

  return fromDinero(add(toDinero(left), toDinero(right)))
}

export function parseVisaAdjustment(input: {
  type: "percent" | "fixed"
  value: string
  currency?: string | null
}) {
  const normalizedValue = input.value.trim()

  if (input.type === "percent") {
    const amount = decimalToScaledInteger(
      normalizedValue,
      VISA_PERCENTAGE_SCALE
    )
    const maximum =
      BigInt(MAX_VISA_MARKUP_PERCENT) * pow10(VISA_PERCENTAGE_SCALE)

    if (amount < 0n || amount > maximum) {
      throw new Error(
        `Percentage markup must be between 0 and ${MAX_VISA_MARKUP_PERCENT}.`
      )
    }

    return {
      amount: amount.toString(),
      scale: VISA_PERCENTAGE_SCALE,
      currency: null,
    }
  }

  const currency = normalizeCurrency(input.currency ?? "")
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Fixed markups require a valid three-letter currency.")
  }

  const scale = getCurrencyPrecision(currency)
  const amount = decimalToScaledInteger(normalizedValue, scale)
  if (amount < 0n) {
    throw new Error("Fixed markup cannot be negative.")
  }

  return { amount: amount.toString(), scale, currency }
}

export function formatVisaAdjustment(rule: VisaPricingRule) {
  const value = scaledIntegerToDecimal(
    rule.adjustmentAmount,
    rule.adjustmentScale
  )
  return rule.adjustmentType === "percent"
    ? `${value}%`
    : `${rule.adjustmentCurrency ?? ""} ${value}`.trim()
}

export function scaledIntegerToDecimal(amount: string, scale: number) {
  const parsed = BigInt(amount)
  const negative = parsed < 0n
  const absolute = negative ? -parsed : parsed
  const factor = pow10(scale)
  const whole = scale === 0 ? absolute : absolute / factor
  const fraction =
    scale === 0
      ? ""
      : (absolute % factor).toString().padStart(scale, "0").replace(/0+$/, "")
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`
}

function calculateMarkup(
  source: Dinero<bigint>,
  sourceCurrency: string,
  rule: VisaPricingRule
) {
  const precision = getCurrencyPrecision(sourceCurrency)

  if (rule.adjustmentType === "percent") {
    const markup = multiply(source, {
      amount: BigInt(rule.adjustmentAmount),
      scale: BigInt(rule.adjustmentScale + 2),
    })
    return transformScale(markup, BigInt(precision), halfUp)
  }

  if (normalizeCurrency(rule.adjustmentCurrency ?? "") !== sourceCurrency) {
    throw new Error("Fixed markup currency does not match the source fee.")
  }

  return transformScale(
    dinero({
      amount: BigInt(rule.adjustmentAmount),
      currency: toDineroCurrency(sourceCurrency),
      scale: BigInt(rule.adjustmentScale),
    }),
    BigInt(precision),
    halfUp
  )
}

function matchesContext(rule: VisaPricingRule, context: VisaPricingContext) {
  if (rule.feeComponent !== context.feeComponent) return false
  if (
    rule.adjustmentType === "fixed" &&
    normalizeCurrency(rule.adjustmentCurrency ?? "") !== context.sourceCurrency
  ) {
    return false
  }
  if (
    rule.nationalityCode &&
    normalizeCountryCode(rule.nationalityCode) !== context.nationalityCode
  ) {
    return false
  }
  if (
    rule.destinationCode &&
    normalizeCountryCode(rule.destinationCode) !== context.destinationCode
  ) {
    return false
  }
  if (rule.visaTypeId && rule.visaTypeId.trim() !== context.visaTypeId) {
    return false
  }
  if (
    rule.providerProductId &&
    rule.providerProductId.trim() !== context.providerProductId
  ) {
    return false
  }
  return true
}

function normalizeContext(context: VisaPricingContext): VisaPricingContext {
  return {
    nationalityCode: normalizeCountryCode(context.nationalityCode),
    destinationCode: normalizeCountryCode(context.destinationCode),
    visaTypeId: normalizeOptional(context.visaTypeId),
    providerProductId: normalizeOptional(context.providerProductId),
    feeComponent: context.feeComponent,
    sourceCurrency: normalizeCurrency(context.sourceCurrency),
  }
}

function scoreSpecificity(rule: VisaPricingRule) {
  return [
    rule.nationalityCode,
    rule.destinationCode,
    rule.visaTypeId,
    rule.providerProductId,
  ].reduce((score, value) => (normalizeOptional(value) ? score + 1 : score), 0)
}

function compareRuleRank(
  left: MatchedVisaPricingRule,
  right: MatchedVisaPricingRule
) {
  if (left.specificity !== right.specificity) {
    return right.specificity - left.specificity
  }
  if (left.rule.priority !== right.rule.priority) {
    return right.rule.priority - left.rule.priority
  }
  const updatedAt =
    right.rule.updatedAt.getTime() - left.rule.updatedAt.getTime()
  return updatedAt || right.rule.id.localeCompare(left.rule.id)
}

function isWithinActiveWindow(rule: VisaPricingRule, now: Date) {
  return (
    (!rule.activeFrom || rule.activeFrom.getTime() <= now.getTime()) &&
    (!rule.activeTo || rule.activeTo.getTime() >= now.getTime())
  )
}

function normalizeMoney(money: SerializedMoney) {
  const currency = normalizeCurrency(money.currency)
  const precision = getCurrencyPrecision(currency)
  return fromDinero(
    transformScale(toDinero({ ...money, currency }), BigInt(precision), halfUp)
  )
}

function toDinero(money: SerializedMoney) {
  return dinero({
    amount: BigInt(money.amount),
    currency: toDineroCurrency(normalizeCurrency(money.currency)),
    scale: BigInt(money.scale),
  })
}

function fromDinero(value: Dinero<bigint>): SerializedMoney {
  const snapshot = toSnapshot(value)
  return {
    amount: snapshot.amount.toString(),
    currency: snapshot.currency.code,
    scale: Number(snapshot.scale),
  }
}

function zeroDinero(currency: string) {
  const precision = getCurrencyPrecision(currency)
  return dinero({
    amount: 0n,
    currency: toDineroCurrency(currency),
    scale: BigInt(precision),
  })
}

function toDineroCurrency(code: string): DineroCurrency<bigint> {
  const exponent = BigInt(getCurrencyPrecision(code))
  return { code, base: TEN, exponent }
}

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase()
}

function normalizeCountryCode(value: string) {
  return value.trim().toUpperCase()
}

function normalizeOptional(value: string | null) {
  const normalized = value?.trim()
  return normalized || null
}

function pow10(exponent: number) {
  return TEN ** BigInt(exponent)
}
