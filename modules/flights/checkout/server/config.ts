import "server-only"

const DEFAULT_ANCILLARY_MARKUP_RATE_PERCENT = 0
const DEFAULT_ANCILLARY_MARKUP_FIXED_AMOUNT = 0
const DEFAULT_CHECKOUT_SESSION_TTL_MINUTES = 30

export interface CheckoutServerConfig {
  settlementPaymentType: "balance"
  ancillaryMarkupRatePercent: number
  ancillaryMarkupFixedAmount: number
  checkoutSessionTtlMinutes: number
}

let cachedConfig: CheckoutServerConfig | null = null

export function getCheckoutServerConfig(): CheckoutServerConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  cachedConfig = {
    settlementPaymentType: "balance",
    ancillaryMarkupRatePercent: clamp(
      parseNumericEnv(
        "ANCILLARY_MARKUP_RATE_PERCENT",
        DEFAULT_ANCILLARY_MARKUP_RATE_PERCENT
      ),
      0,
      100
    ),
    ancillaryMarkupFixedAmount: clamp(
      parseNumericEnv(
        "ANCILLARY_MARKUP_FIXED_AMOUNT",
        DEFAULT_ANCILLARY_MARKUP_FIXED_AMOUNT
      ),
      0,
      1_000
    ),
    checkoutSessionTtlMinutes: clamp(
      parseIntEnv("CHECKOUT_SESSION_TTL_MINUTES", DEFAULT_CHECKOUT_SESSION_TTL_MINUTES),
      5,
      24 * 60
    ),
  }

  return cachedConfig
}

function parseIntEnv(name: string, fallback: number) {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseNumericEnv(name: string, fallback: number) {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
