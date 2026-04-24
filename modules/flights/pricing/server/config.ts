import { parseIntegerFromEnv } from "@/lib/shared/env"
import { clamp } from "@/lib/shared/number"

const DEFAULT_QUOTE_TTL_MS = 10 * 60 * 1000

export interface PricingServerConfig {
  quoteTtlMs: number
}

let cachedConfig: PricingServerConfig | null = null

export function getPricingServerConfig(): PricingServerConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const ttlMs = clamp(
    parseIntegerFromEnv("PRICING_QUOTE_TTL_MS", DEFAULT_QUOTE_TTL_MS),
    60_000,
    60 * 60 * 1000
  )

  cachedConfig = {
    quoteTtlMs: ttlMs,
  }

  return cachedConfig
}
