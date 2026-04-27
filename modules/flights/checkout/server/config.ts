import "server-only"

import { parseIntegerFromEnv, parseNumberFromEnv } from "@/lib/shared/env"
import { clamp } from "@/lib/shared/number"

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
      parseNumberFromEnv(
        "ANCILLARY_MARKUP_RATE_PERCENT",
        DEFAULT_ANCILLARY_MARKUP_RATE_PERCENT
      ),
      0,
      100
    ),
    ancillaryMarkupFixedAmount: clamp(
      parseNumberFromEnv(
        "ANCILLARY_MARKUP_FIXED_AMOUNT",
        DEFAULT_ANCILLARY_MARKUP_FIXED_AMOUNT
      ),
      0,
      1_000
    ),
    checkoutSessionTtlMinutes: clamp(
      parseIntegerFromEnv(
        "CHECKOUT_SESSION_TTL_MINUTES",
        DEFAULT_CHECKOUT_SESSION_TTL_MINUTES
      ),
      5,
      24 * 60
    ),
  }

  return cachedConfig
}
