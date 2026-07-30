import "server-only"

import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"
import {
  CURRENCY_REGISTRY,
  decimalToScaledInteger,
  FX_RATE_SCALE,
  type SerializedFxRate,
  type SerializedFxSnapshot,
} from "@/modules/currency/domain"
import {
  defaultFxRateSnapshotRepository,
  type FxRateSnapshotRecord,
  type FxRateSnapshotRepository,
} from "@/modules/currency/server/fx-rate-repository"

const PROVIDER = "open_exchange_rates" as const
const BASE_CURRENCY = "USD" as const
const FRESH_TTL_MS = 6 * 60 * 60 * 1000
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const REFRESH_LEASE_MS = 30 * 1000
const DEFAULT_TIMEOUT_MS = 5_000

export interface FxServiceDeps {
  repository: FxRateSnapshotRepository
  now: () => Date
  fetchRates: () => Promise<ProviderRates>
}

export interface ProviderRates {
  rates: Record<string, SerializedFxRate>
  providerUpdatedAt: Date
}

export async function getDisplayFxSnapshot(
  input: {
    scheduleRefresh?: (task: () => Promise<void>) => void
  } = {},
  deps: FxServiceDeps = defaultDeps
): Promise<SerializedFxSnapshot | null> {
  let current: FxRateSnapshotRecord | null = null

  try {
    current = await deps.repository.find()
  } catch (error) {
    logFlightFlowError("currency.fx", "cache_read_failed", error)
  }

  const now = deps.now()

  if (isUsableRecord(current) && current.freshUntil > now) {
    logFlightFlow("currency.fx", "cache_hit", {
      fetchedAt: current.fetchedAt.toISOString(),
    })
    return serializeRecord(current, false)
  }

  if (isUsableRecord(current) && current.staleUntil > now) {
    logFlightFlow("currency.fx", "stale_cache_hit", {
      fetchedAt: current.fetchedAt.toISOString(),
    })

    if (input.scheduleRefresh) {
      input.scheduleRefresh(async () => {
        await refreshRates(deps)
      })
    } else {
      void refreshRates(deps)
    }

    return serializeRecord(current, true)
  }

  const refreshed = await refreshRates(deps)

  if (isUsableRecord(refreshed)) {
    return serializeRecord(refreshed, false)
  }

  logFlightFlow("currency.fx", "source_currency_fallback", {
    reason: current ? "cache_expired" : "cache_empty",
  })
  return null
}

export async function refreshRates(
  deps: FxServiceDeps = defaultDeps
): Promise<FxRateSnapshotRecord | null> {
  const now = deps.now()
  let claimed = false

  try {
    claimed = await deps.repository.claimRefreshLease(
      now,
      new Date(now.getTime() + REFRESH_LEASE_MS)
    )
  } catch (error) {
    logFlightFlowError("currency.fx", "refresh_lease_failed", error)
    return null
  }

  if (!claimed) {
    logFlightFlow("currency.fx", "refresh_skipped_lease_held")
    return null
  }

  try {
    const provider = await deps.fetchRates()
    const saved = await deps.repository.save({
      provider: PROVIDER,
      baseCurrency: BASE_CURRENCY,
      rates: provider.rates,
      providerUpdatedAt: provider.providerUpdatedAt,
      fetchedAt: now,
      freshUntil: new Date(now.getTime() + FRESH_TTL_MS),
      staleUntil: new Date(now.getTime() + STALE_TTL_MS),
    })

    logFlightFlow("currency.fx", "refresh_succeeded", {
      providerUpdatedAt: provider.providerUpdatedAt.toISOString(),
      ratesCount: Object.keys(provider.rates).length,
    })
    return saved
  } catch (error) {
    logFlightFlowError("currency.fx", "refresh_failed", error)
    try {
      await deps.repository.releaseRefreshLease(
        error instanceof Error ? error.message : String(error)
      )
    } catch (releaseError) {
      logFlightFlowError(
        "currency.fx",
        "refresh_lease_release_failed",
        releaseError
      )
    }
    return null
  }
}

async function fetchOpenExchangeRates(): Promise<ProviderRates> {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID?.trim()

  if (!appId) {
    throw new Error("OPEN_EXCHANGE_RATES_APP_ID is not configured.")
  }

  const timeoutMs = parsePositiveInteger(
    process.env.OPEN_EXCHANGE_RATES_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS
  )
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(appId)}`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      throw new Error(`Open Exchange Rates returned HTTP ${response.status}.`)
    }

    const payload = (await response.json()) as {
      base?: unknown
      timestamp?: unknown
      rates?: unknown
    }

    try {
      return parseProviderPayload(payload)
    } catch (error) {
      logFlightFlowError("currency.fx", "invalid_provider_response", error)
      throw error
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function parseProviderPayload(payload: {
  base?: unknown
  timestamp?: unknown
  rates?: unknown
}): ProviderRates {
  if (payload.base !== BASE_CURRENCY) {
    throw new Error("Open Exchange Rates response must use USD as its base.")
  }

  if (
    typeof payload.timestamp !== "number" ||
    !Number.isSafeInteger(payload.timestamp) ||
    payload.timestamp <= 0
  ) {
    throw new Error("Open Exchange Rates response has an invalid timestamp.")
  }

  if (!payload.rates || typeof payload.rates !== "object") {
    throw new Error("Open Exchange Rates response has no rates.")
  }

  const rates: Record<string, SerializedFxRate> = {}

  for (const [rawCode, rawValue] of Object.entries(payload.rates)) {
    const code = rawCode.trim().toUpperCase()

    if (!/^[A-Z]{3}$/.test(code)) {
      continue
    }

    const decimal =
      typeof rawValue === "number" || typeof rawValue === "string"
        ? String(rawValue)
        : null

    if (!decimal) {
      continue
    }

    try {
      const amount = decimalToScaledInteger(decimal, FX_RATE_SCALE)

      if (amount > 0n) {
        rates[code] = {
          amount: amount.toString(),
          scale: FX_RATE_SCALE,
        }
      }
    } catch {
      continue
    }
  }

  rates.USD = {
    amount: decimalToScaledInteger("1", FX_RATE_SCALE).toString(),
    scale: FX_RATE_SCALE,
  }

  const missing = CURRENCY_REGISTRY.map((currency) => currency.code).filter(
    (code) => !rates[code]
  )

  if (missing.length > 0) {
    throw new Error(`Open Exchange Rates response is missing: ${missing.join(", ")}.`)
  }

  return {
    rates,
    providerUpdatedAt: new Date(payload.timestamp * 1000),
  }
}

function serializeRecord(
  record: FxRateSnapshotRecord,
  stale: boolean
): SerializedFxSnapshot {
  return {
    baseCurrency: BASE_CURRENCY,
    rates: record.rates,
    providerUpdatedAt: record.providerUpdatedAt.toISOString(),
    fetchedAt: record.fetchedAt.toISOString(),
    stale,
  }
}

function isUsableRecord(
  record: FxRateSnapshotRecord | null
): record is FxRateSnapshotRecord {
  if (
    !record ||
    record.provider !== PROVIDER ||
    record.baseCurrency !== BASE_CURRENCY ||
    !Number.isFinite(record.providerUpdatedAt.getTime()) ||
    !Number.isFinite(record.fetchedAt.getTime())
  ) {
    return false
  }

  return CURRENCY_REGISTRY.every((currency) => {
    const rate = record.rates[currency.code]

    if (
      !rate ||
      typeof rate.amount !== "string" ||
      !/^\d+$/.test(rate.amount) ||
      typeof rate.scale !== "number" ||
      !Number.isInteger(rate.scale) ||
      rate.scale < 0 ||
      rate.scale > 18
    ) {
      return false
    }

    try {
      return BigInt(rate.amount) > 0n
    } catch {
      return false
    }
  })
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const defaultDeps: FxServiceDeps = {
  repository: defaultFxRateSnapshotRepository,
  now: () => new Date(),
  fetchRates: fetchOpenExchangeRates,
}
