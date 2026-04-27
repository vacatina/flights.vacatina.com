import { parseIntegerFromEnv } from "@/lib/shared/env"
import { clamp } from "@/lib/shared/number"

const DEFAULT_PARTIAL_OFFER_MAX_CONNECTIONS = 2
const DEFAULT_SUPPLIER_TIMEOUT_MS = 10_000
const DEFAULT_RESULTS_PAGE_SIZE = 20
const DEFAULT_AIRLINE_LOGO_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const DEFAULT_AIRLINE_LOGO_CACHE_MAX_ENTRIES = 300

export interface DuffelFlightConfig {
  partialOfferCreateMaxConnections: 0 | 1 | 2
  partialOfferCreateSupplierTimeoutMs: number
  resultsPageSize: number
  airlineLogoCacheTtlMs: number
  airlineLogoCacheMaxEntries: number
}

let cachedConfig: DuffelFlightConfig | null = null

export function getDuffelFlightConfig(): DuffelFlightConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const partialOfferCreateMaxConnections = clamp(
    parseIntegerFromEnv(
      "DUFFEL_DEFAULT_MAX_CONNECTIONS",
      DEFAULT_PARTIAL_OFFER_MAX_CONNECTIONS
    ),
    0,
    2
  ) as 0 | 1 | 2

  const partialOfferCreateSupplierTimeoutMs = clamp(
    parseIntegerFromEnv("DUFFEL_SUPPLIER_TIMEOUT_MS", DEFAULT_SUPPLIER_TIMEOUT_MS),
    2_000,
    60_000
  )

  const resultsPageSize = clamp(
    parseIntegerFromEnv("DUFFEL_RESULTS_PAGE_SIZE", DEFAULT_RESULTS_PAGE_SIZE),
    1,
    200
  )

  const airlineLogoCacheTtlMs = clamp(
    parseIntegerFromEnv(
      "DUFFEL_AIRLINE_LOGO_CACHE_TTL_MS",
      DEFAULT_AIRLINE_LOGO_CACHE_TTL_MS
    ),
    60_000,
    24 * 60 * 60 * 1000
  )

  const airlineLogoCacheMaxEntries = clamp(
    parseIntegerFromEnv(
      "DUFFEL_AIRLINE_LOGO_CACHE_MAX_ENTRIES",
      DEFAULT_AIRLINE_LOGO_CACHE_MAX_ENTRIES
    ),
    50,
    5_000
  )

  cachedConfig = {
    partialOfferCreateMaxConnections,
    partialOfferCreateSupplierTimeoutMs,
    resultsPageSize,
    airlineLogoCacheTtlMs,
    airlineLogoCacheMaxEntries,
  }

  return cachedConfig
}
