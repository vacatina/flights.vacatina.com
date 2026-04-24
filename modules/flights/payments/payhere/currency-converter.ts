import "server-only"

import { toNumeric } from "@/lib/shared/number"
import type { PayHereConvertedAmount } from "@/modules/flights/payments/payhere/types"

const DEFAULT_FX_BUFFER_PERCENT = 3

const STATIC_TO_LKR_RATES: Record<string, number> = {
  LKR: 1,
  USD: 320,
  GBP: 410,
  EUR: 350,
  AED: 87,
  INR: 3.8,
  AUD: 210,
  CAD: 235,
  SGD: 245,
}

export function convertToLkr(input: {
  amount: number
  sourceCurrency: string
  bufferPercent?: number
}): PayHereConvertedAmount {
  const sourceCurrency = normalizeCurrency(input.sourceCurrency)
  const sourceAmount = toNumeric(input.amount)
  const baseRate = STATIC_TO_LKR_RATES[sourceCurrency]

  if (!baseRate || !Number.isFinite(baseRate) || baseRate <= 0) {
    throw new Error(
      `PayHere pay_now is unavailable for ${sourceCurrency}. Please choose hold or use another fare currency.`
    )
  }

  const bufferPercent = sanitizeBufferPercent(input.bufferPercent)
  const effectiveRate = baseRate * (1 + bufferPercent / 100)
  const convertedAmount = roundLkr(sourceAmount * effectiveRate)

  return {
    sourceCurrency,
    targetCurrency: "LKR",
    sourceAmount,
    convertedAmount,
    baseRate,
    bufferPercent,
    effectiveRate,
  }
}

export function supportsPayHereConversion(sourceCurrency: string) {
  const normalized = normalizeCurrency(sourceCurrency)
  return normalized in STATIC_TO_LKR_RATES
}

function sanitizeBufferPercent(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return DEFAULT_FX_BUFFER_PERCENT
  }

  const numeric = toNumeric(value)
  if (numeric < 0) {
    return 0
  }

  if (numeric > 20) {
    return 20
  }

  return numeric
}

function normalizeCurrency(value: string) {
  const normalized = value.trim().toUpperCase()
  return normalized || "LKR"
}

function roundLkr(value: number) {
  return Math.round(value * 100) / 100
}

