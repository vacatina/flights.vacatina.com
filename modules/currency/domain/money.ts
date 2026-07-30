import {
  convert,
  dinero,
  halfUp,
  toSnapshot,
  transformScale,
  type DineroCurrency,
} from "dinero.js/bigint"

import {
  getCurrencyDefinition,
  getCurrencyPrecision,
  isDisplayCurrencyCode,
} from "@/modules/currency/domain/registry"
import type {
  DisplayCurrencyCode,
  FormattedMoney,
  SerializedFxRate,
  SerializedFxSnapshot,
  SerializedMoney,
} from "@/modules/currency/domain/types"

export const FX_RATE_SCALE = 12
const TEN = 10n

export function serializeMoney(
  value: string | number,
  currency: string,
  scale = getCurrencyPrecision(currency)
): SerializedMoney {
  const normalizedCurrency = normalizeCurrencyCode(currency)

  return {
    amount: decimalToScaledInteger(String(value), scale).toString(),
    currency: normalizedCurrency,
    scale,
  }
}

export function convertMoney(
  money: SerializedMoney,
  targetCurrency: DisplayCurrencyCode,
  snapshot: SerializedFxSnapshot | null
): SerializedMoney | null {
  const sourceCurrency = normalizeCurrencyCode(money.currency)
  const targetPrecision = getCurrencyPrecision(targetCurrency)

  if (sourceCurrency === targetCurrency) {
    return normalizeMoneyScale(money, targetPrecision)
  }

  if (!snapshot || snapshot.baseCurrency !== "USD") {
    return null
  }

  const sourceRate = snapshot.rates[sourceCurrency]
  const targetRate = snapshot.rates[targetCurrency]

  if (!sourceRate || !targetRate) {
    return null
  }

  try {
    const sourceDinero = dinero({
      amount: BigInt(money.amount),
      currency: toDineroCurrency(sourceCurrency),
      scale: BigInt(money.scale),
    })
    const crossRate = createCrossRate(sourceRate, targetRate)
    const converted = convert(sourceDinero, toDineroCurrency(targetCurrency), {
      [targetCurrency]: {
        amount: crossRate,
        scale: BigInt(FX_RATE_SCALE),
      },
    })
    const normalized = transformScale(converted, BigInt(targetPrecision), halfUp)
    const convertedSnapshot = toSnapshot(normalized)

    return {
      amount: convertedSnapshot.amount.toString(),
      currency: targetCurrency,
      scale: Number(convertedSnapshot.scale),
    }
  } catch {
    return null
  }
}

export function formatMoneyForDisplay(input: {
  money: SerializedMoney
  targetCurrency: DisplayCurrencyCode
  snapshot: SerializedFxSnapshot | null
  locale?: string
  fallbackLabel?: string | null
}): FormattedMoney {
  const converted = convertMoney(
    input.money,
    input.targetCurrency,
    input.snapshot
  )

  if (converted) {
    return {
      label: formatSerializedMoney(converted, input.locale),
      currency: converted.currency,
      converted:
        normalizeCurrencyCode(input.money.currency) !== converted.currency,
      stale: input.snapshot?.stale ?? false,
    }
  }

  return {
    label:
      input.fallbackLabel?.trim() ||
      formatSerializedMoney(input.money, input.locale),
    currency: normalizeCurrencyCode(input.money.currency),
    converted: false,
    stale: false,
  }
}

export function formatSerializedMoney(
  money: SerializedMoney,
  locale = "en-LK"
) {
  const currency = normalizeCurrencyCode(money.currency)
  const precision = getCurrencyPrecision(currency)
  const normalized = normalizeMoneyScale(money, precision)
  const rawAmount = BigInt(normalized.amount)
  const negative = rawAmount < 0n
  const absoluteAmount = negative ? -rawAmount : rawAmount
  const factor = pow10(precision)
  const major = precision === 0 ? absoluteAmount : absoluteAmount / factor
  const fraction =
    precision === 0
      ? ""
      : (absoluteAmount % factor).toString().padStart(precision, "0")

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
    const parts = formatter.formatToParts(major)
    const label = parts
      .map((part) => (part.type === "fraction" ? fraction : part.value))
      .join("")

    return negative ? `-${label}` : label
  } catch {
    const symbol = isDisplayCurrencyCode(currency)
      ? getCurrencyDefinition(currency).symbol
      : currency
    const decimal = precision === 0 ? major.toString() : `${major}.${fraction}`
    return `${negative ? "-" : ""}${symbol}${decimal}`
  }
}

export function decimalToScaledInteger(value: string, scale: number) {
  if (!Number.isInteger(scale) || scale < 0 || scale > 18) {
    throw new Error("Money scale must be an integer between 0 and 18.")
  }

  const normalized = value.trim()
  const match = normalized.match(
    /^([+-])?(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/
  )

  if (!match) {
    throw new Error(`Invalid decimal money value: ${value}`)
  }

  const negative = match[1] === "-"
  const whole = match[2]
  const fraction = match[3] ?? ""
  const exponent = Number(match[4] ?? 0)
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "")
  const decimalPlaces = fraction.length - exponent
  const shift = scale - decimalPlaces
  let scaled: bigint

  if (shift >= 0) {
    scaled = BigInt(digits || "0") * pow10(shift)
  } else {
    const divisor = pow10(-shift)
    scaled = divideHalfUp(BigInt(digits || "0"), divisor)
  }

  return negative ? -scaled : scaled
}

export function scaledIntegerToDecimal(amount: string, scale: number) {
  const raw = BigInt(amount)
  const negative = raw < 0n
  const absolute = negative ? -raw : raw

  if (scale === 0) {
    return `${negative ? "-" : ""}${absolute}`
  }

  const digits = absolute.toString().padStart(scale + 1, "0")
  const whole = digits.slice(0, -scale)
  const fraction = digits.slice(-scale)

  return `${negative ? "-" : ""}${whole}.${fraction}`
}

function normalizeMoneyScale(money: SerializedMoney, scale: number) {
  const normalized = transformScale(
    dinero({
      amount: BigInt(money.amount),
      currency: toDineroCurrency(money.currency),
      scale: BigInt(money.scale),
    }),
    BigInt(scale),
    halfUp
  )
  const snapshot = toSnapshot(normalized)

  return {
    amount: snapshot.amount.toString(),
    currency: snapshot.currency.code,
    scale: Number(snapshot.scale),
  } satisfies SerializedMoney
}

function createCrossRate(source: SerializedFxRate, target: SerializedFxRate) {
  const sourceAtScale = rescaleRate(source, FX_RATE_SCALE)
  const targetAtScale = rescaleRate(target, FX_RATE_SCALE)

  if (sourceAtScale <= 0n || targetAtScale <= 0n) {
    throw new Error("FX rates must be positive.")
  }

  return divideHalfUp(targetAtScale * pow10(FX_RATE_SCALE), sourceAtScale)
}

function rescaleRate(rate: SerializedFxRate, targetScale: number) {
  const amount = BigInt(rate.amount)

  if (rate.scale === targetScale) {
    return amount
  }

  if (rate.scale < targetScale) {
    return amount * pow10(targetScale - rate.scale)
  }

  return divideHalfUp(amount, pow10(rate.scale - targetScale))
}

function toDineroCurrency(code: string): DineroCurrency<bigint, string> {
  const normalized = normalizeCurrencyCode(code)

  return {
    code: normalized,
    base: 10n,
    exponent: BigInt(getCurrencyPrecision(normalized)),
  }
}

function divideHalfUp(dividend: bigint, divisor: bigint) {
  if (divisor === 0n) {
    throw new Error("Cannot divide by zero.")
  }

  const quotient = dividend / divisor
  const remainder = dividend % divisor

  if (remainder === 0n) {
    return quotient
  }

  const absoluteRemainder = remainder < 0n ? -remainder : remainder
  const absoluteDivisor = divisor < 0n ? -divisor : divisor
  const shouldRound = absoluteRemainder * 2n >= absoluteDivisor

  if (!shouldRound) {
    return quotient
  }

  return (dividend < 0n) !== (divisor < 0n) ? quotient - 1n : quotient + 1n
}

function pow10(power: number) {
  return TEN ** BigInt(power)
}

function normalizeCurrencyCode(currency: string) {
  const normalized = currency.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "USD"
}
