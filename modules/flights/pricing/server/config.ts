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

function parseIntegerFromEnv(name: string, fallback: number) {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const parsed = Number.parseInt(raw, 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return parsed
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
