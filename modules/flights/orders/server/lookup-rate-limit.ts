import "server-only"

import { getOrdersServerConfig } from "@/modules/flights/orders/server/config"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const inMemoryLookupAttempts = new Map<string, RateLimitEntry>()

export function consumeBookingLookupAttempt(input: {
  ipAddress: string
  bookingReference: string
  now?: number
}) {
  const config = getOrdersServerConfig()
  const now = input.now ?? Date.now()
  const key = `${input.ipAddress}:${input.bookingReference}`
  const current = inMemoryLookupAttempts.get(key)

  if (!current || current.resetAt <= now) {
    inMemoryLookupAttempts.set(key, {
      count: 1,
      resetAt: now + config.lookupRateLimitWindowMs,
    })
    return {
      allowed: true,
      remaining: Math.max(config.lookupRateLimitMaxAttempts - 1, 0),
    }
  }

  if (current.count >= config.lookupRateLimitMaxAttempts) {
    return {
      allowed: false,
      remaining: 0,
    }
  }

  current.count += 1
  inMemoryLookupAttempts.set(key, current)

  return {
    allowed: true,
    remaining: Math.max(config.lookupRateLimitMaxAttempts - current.count, 0),
  }
}

export function resetBookingLookupRateLimiterForTests() {
  inMemoryLookupAttempts.clear()
}
