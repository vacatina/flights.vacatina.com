import {
  decimalToScaledInteger,
  scaledIntegerToDecimal,
} from "@/modules/currency/domain/money"
import { getCurrencyPrecision } from "@/modules/currency/domain/registry"
import type { SerializedMoney } from "@/modules/currency/domain/types"

export function parseListingFee(
  value: string | null | undefined,
  currency: string | null
) {
  if (!value?.trim()) return null
  if (!currency) throw new Error("Choose a currency before entering a price")

  const normalized = value.trim()
  const precision = getCurrencyPrecision(currency)
  const fraction = normalized.split(".")[1] ?? ""
  if (!/^\d+(?:\.\d+)?$/.test(normalized) || fraction.length > precision) {
    throw new Error(
      `Enter a nonnegative price with at most ${precision} decimals`
    )
  }

  const amount = decimalToScaledInteger(normalized, precision)
  if (amount.toString().length > 30) {
    throw new Error("Price exceeds the supported amount")
  }
  return amount.toString()
}

export function listingFeeDecimal(
  amount: string | null,
  currency: string | null
) {
  if (amount === null || !currency) return ""
  return scaledIntegerToDecimal(amount, getCurrencyPrecision(currency))
}

export function getListingEstimate(input: {
  feeCurrency: string | null
  priceMinor: string | null
}): SerializedMoney | null {
  const { feeCurrency, priceMinor } = input
  if (!feeCurrency || priceMinor === null) {
    return null
  }
  return {
    amount: priceMinor,
    currency: feeCurrency,
    scale: getCurrencyPrecision(feeCurrency),
  }
}
