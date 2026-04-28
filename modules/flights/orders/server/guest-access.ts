import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { cookies } from "next/headers"

import { getOrdersServerConfig } from "@/modules/flights/orders/server/config"

interface BookingAccessPayload {
  bookingReference: string
  contactEmailHash: string
  issuedAt: number
  expiresAt: number
}

interface BookingAccessCookieStore {
  get: (name: string) => { value: string } | undefined
  set?: (
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean
      sameSite?: "lax" | "strict" | "none"
      secure?: boolean
      path?: string
      expires?: Date
    }
  ) => unknown
}

const TOKEN_SEPARATOR = "."

export async function setBookingLookupAccessCookie(input: {
  bookingReference: string
  contactEmailHash: string
  cookieStore?: BookingAccessCookieStore
}) {
  const config = getOrdersServerConfig()
  const now = Date.now()
  const expiresAt = now + config.lookupTokenTtlMs
  const payload: BookingAccessPayload = {
    bookingReference: input.bookingReference,
    contactEmailHash: input.contactEmailHash,
    issuedAt: now,
    expiresAt,
  }

  const token = signBookingAccessPayload(payload)
  const cookieStore =
    input.cookieStore ?? ((await cookies()) as unknown as BookingAccessCookieStore)

  cookieStore.set?.(config.lookupTokenCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  })
}

export async function canGuestAccessBooking(input: {
  bookingReference: string
  contactEmailHash: string
  cookieStore?: BookingAccessCookieStore
}) {
  const config = getOrdersServerConfig()
  const cookieStore =
    input.cookieStore ?? ((await cookies()) as unknown as BookingAccessCookieStore)
  const token = cookieStore.get(config.lookupTokenCookieName)?.value

  const payload = verifyBookingAccessPayload(token)

  if (!payload) {
    return false
  }

  if (payload.bookingReference !== input.bookingReference) {
    return false
  }

  return payload.contactEmailHash === input.contactEmailHash
}

function signBookingAccessPayload(
  payload: BookingAccessPayload,
  secret = getOrdersServerConfig().lookupTokenSecret
) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  )
  const signature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url")
  return `${encodedPayload}${TOKEN_SEPARATOR}${signature}`
}

function verifyBookingAccessPayload(
  token: string | undefined | null,
  secret = getOrdersServerConfig().lookupTokenSecret
): BookingAccessPayload | null {
  if (!token || !token.includes(TOKEN_SEPARATOR)) {
    return null
  }

  const [encodedPayload, receivedSignature] = token.split(TOKEN_SEPARATOR)

  if (!encodedPayload || !receivedSignature) {
    return null
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url")

  const expectedBuffer = Buffer.from(expectedSignature, "utf8")
  const receivedBuffer = Buffer.from(receivedSignature, "utf8")

  if (expectedBuffer.length !== receivedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as BookingAccessPayload

    if (
      typeof parsed.bookingReference !== "string" ||
      parsed.bookingReference.trim().length === 0 ||
      typeof parsed.contactEmailHash !== "string" ||
      parsed.contactEmailHash.trim().length === 0 ||
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null
    }

    if (parsed.expiresAt <= Date.now()) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}
