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
    parseIntFromEnv(
      "DUFFEL_DEFAULT_MAX_CONNECTIONS",
      DEFAULT_PARTIAL_OFFER_MAX_CONNECTIONS
    ),
    0,
    2
  ) as 0 | 1 | 2

  const partialOfferCreateSupplierTimeoutMs = clamp(
    parseIntFromEnv("DUFFEL_SUPPLIER_TIMEOUT_MS", DEFAULT_SUPPLIER_TIMEOUT_MS),
    2_000,
    60_000
  )

  const resultsPageSize = clamp(
    parseIntFromEnv("DUFFEL_RESULTS_PAGE_SIZE", DEFAULT_RESULTS_PAGE_SIZE),
    1,
    200
  )

  const airlineLogoCacheTtlMs = clamp(
    parseIntFromEnv(
      "DUFFEL_AIRLINE_LOGO_CACHE_TTL_MS",
      DEFAULT_AIRLINE_LOGO_CACHE_TTL_MS
    ),
    60_000,
    24 * 60 * 60 * 1000
  )

  const airlineLogoCacheMaxEntries = clamp(
    parseIntFromEnv(
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

function parseIntFromEnv(name: string, fallback: number) {
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
