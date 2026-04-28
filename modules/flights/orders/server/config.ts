import "server-only"

import { parseIntegerFromEnv } from "@/lib/shared/env"
import { clamp } from "@/lib/shared/number"
import { getAuthServerConfig } from "@/modules/auth/server/config"

const DEFAULT_LOOKUP_TOKEN_COOKIE_NAME = "booking_lookup_access"
const DEFAULT_LOOKUP_TOKEN_TTL_MS = 30 * 60 * 1000
const DEFAULT_LOOKUP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const DEFAULT_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS = 6

export interface OrdersServerConfig {
  lookupTokenCookieName: string
  lookupTokenTtlMs: number
  lookupTokenSecret: string
  lookupRateLimitWindowMs: number
  lookupRateLimitMaxAttempts: number
  emailHashSecret: string
}

let cachedConfig: OrdersServerConfig | null = null

export function getOrdersServerConfig(): OrdersServerConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const authConfig = getAuthServerConfig()
  const lookupTokenSecret =
    process.env.BOOKING_LOOKUP_TOKEN_SECRET?.trim() || authConfig.guestSessionSecret
  const emailHashSecret =
    process.env.BOOKING_EMAIL_HASH_SECRET?.trim() || authConfig.guestSessionSecret

  cachedConfig = {
    lookupTokenCookieName:
      process.env.BOOKING_LOOKUP_TOKEN_COOKIE_NAME?.trim() ||
      DEFAULT_LOOKUP_TOKEN_COOKIE_NAME,
    lookupTokenTtlMs: clamp(
      parseIntegerFromEnv("BOOKING_LOOKUP_TOKEN_TTL_MS", DEFAULT_LOOKUP_TOKEN_TTL_MS),
      5 * 60 * 1000,
      24 * 60 * 60 * 1000
    ),
    lookupTokenSecret,
    lookupRateLimitWindowMs: clamp(
      parseIntegerFromEnv(
        "BOOKING_LOOKUP_RATE_LIMIT_WINDOW_MS",
        DEFAULT_LOOKUP_RATE_LIMIT_WINDOW_MS
      ),
      60_000,
      60 * 60 * 1000
    ),
    lookupRateLimitMaxAttempts: clamp(
      parseIntegerFromEnv(
        "BOOKING_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS",
        DEFAULT_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS
      ),
      1,
      100
    ),
    emailHashSecret,
  }

  return cachedConfig
}
