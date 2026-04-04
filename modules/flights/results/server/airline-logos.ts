import type { Airline, Offer } from "@duffel/api/types"

import { getDuffelFlightConfig } from "@/lib/duffel/config"
import { logDuffelError } from "@/modules/flights/results/server/error-map"

interface AirlineLogoCacheEntry {
  expiresAt: number
  logoUrl: string | null
}

const duffelConfig = getDuffelFlightConfig()
const airlineLogoCache = new Map<string, AirlineLogoCacheEntry>()

export async function getAirlineLogosByAirlineId(airlineIds: string[]) {
  const result: Record<string, string> = {}
  const now = Date.now()
  const idsToFetch: string[] = []

  for (const airlineId of airlineIds) {
    const cachedLogo = getCachedAirlineLogo(airlineId, now)

    if (cachedLogo === undefined) {
      idsToFetch.push(airlineId)
      continue
    }

    if (cachedLogo) {
      result[airlineId] = cachedLogo
    }
  }

  if (idsToFetch.length > 0) {
    try {
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const responses = await Promise.allSettled(
        idsToFetch.map((airlineId) => client.airlines.get(airlineId))
      )

      for (let index = 0; index < responses.length; index += 1) {
        const airlineId = idsToFetch[index]
        const response = responses[index]

        if (response.status === "fulfilled") {
          const airline = response.value.data as Airline
          const logoUrl = airline.logo_symbol_url ?? airline.logo_lockup_url ?? null
          setCachedAirlineLogo(airlineId, logoUrl, now)
          continue
        }

        setCachedAirlineLogo(airlineId, null, now)
        logDuffelError("airlines.get failed", response.reason, { airlineId })
      }
    } catch (error) {
      logDuffelError("airlines.get batch failed", error, {
        airlineIds: idsToFetch,
      })
    }
  }

  for (const airlineId of idsToFetch) {
    const logoUrl = getCachedAirlineLogo(airlineId, now)

    if (logoUrl) {
      result[airlineId] = logoUrl
    }
  }

  return result
}

export function getAirlineIdsFromOffers(offers: Offer[]) {
  return Array.from(
    new Set(
      offers
        .map((offer) => offer.owner.id)
        .filter((airlineId): airlineId is string => Boolean(airlineId))
    )
  )
}

function getCachedAirlineLogo(airlineId: string, now: number) {
  const cached = airlineLogoCache.get(airlineId)

  if (!cached) {
    return undefined
  }

  if (cached.expiresAt <= now) {
    airlineLogoCache.delete(airlineId)
    return undefined
  }

  airlineLogoCache.delete(airlineId)
  airlineLogoCache.set(airlineId, cached)

  return cached.logoUrl
}

function setCachedAirlineLogo(airlineId: string, logoUrl: string | null, now: number) {
  airlineLogoCache.set(airlineId, {
    logoUrl,
    expiresAt: now + duffelConfig.airlineLogoCacheTtlMs,
  })

  while (airlineLogoCache.size > duffelConfig.airlineLogoCacheMaxEntries) {
    const oldestKey = airlineLogoCache.keys().next().value as string | undefined

    if (!oldestKey) {
      break
    }

    airlineLogoCache.delete(oldestKey)
  }
}
