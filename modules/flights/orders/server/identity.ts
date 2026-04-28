import "server-only"

import { createHash, randomUUID, timingSafeEqual } from "node:crypto"

import { getOrdersServerConfig } from "@/modules/flights/orders/server/config"

const BOOKING_REFERENCE_PREFIX = "BK"

export function createBookingReference() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()
  return `${BOOKING_REFERENCE_PREFIX}-${suffix}`
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function createEmailHash(email: string) {
  const config = getOrdersServerConfig()
  const normalizedEmail = normalizeEmail(email)
  return createHash("sha256")
    .update(`${config.emailHashSecret}:${normalizedEmail}`)
    .digest("hex")
}

export function isEmailHashMatch(input: {
  expectedHash: string
  email: string
}) {
  const actualHash = createEmailHash(input.email)
  return constantTimeEqual(input.expectedHash, actualHash)
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8")
  const rightBuffer = Buffer.from(right, "utf8")

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
