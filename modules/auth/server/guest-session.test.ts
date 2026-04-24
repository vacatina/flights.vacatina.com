import { expect, test, vi } from "vitest"

import {
  resolveGuestSession,
  createSignedGuestSessionToken,
  verifySignedGuestSessionToken,
} from "@/modules/auth/server/guest-session"

const SECRET = "test-secret"

test("verifySignedGuestSessionToken accepts a valid signed token", () => {
  const payload = {
    guestId: "gst_123",
    issuedAt: Date.parse("2026-04-11T10:00:00.000Z"),
    expiresAt: Date.parse("2026-04-11T11:00:00.000Z"),
  }
  const token = createSignedGuestSessionToken(payload, SECRET)

  const verified = verifySignedGuestSessionToken(token, {
    secret: SECRET,
    now: () => new Date("2026-04-11T10:30:00.000Z"),
  })

  expect(verified).toEqual(payload)
})

test("verifySignedGuestSessionToken rejects tampered token", () => {
  const token = createSignedGuestSessionToken(
    {
      guestId: "gst_123",
      issuedAt: Date.parse("2026-04-11T10:00:00.000Z"),
      expiresAt: Date.parse("2026-04-11T11:00:00.000Z"),
    },
    SECRET
  )
  const [payload] = token.split(".")
  const tampered = `${payload}.invalid-signature`

  const verified = verifySignedGuestSessionToken(tampered, {
    secret: SECRET,
    now: () => new Date("2026-04-11T10:30:00.000Z"),
  })

  expect(verified).toBeNull()
})

test("verifySignedGuestSessionToken rejects expired token", () => {
  const token = createSignedGuestSessionToken(
    {
      guestId: "gst_123",
      issuedAt: Date.parse("2026-04-11T10:00:00.000Z"),
      expiresAt: Date.parse("2026-04-11T10:10:00.000Z"),
    },
    SECRET
  )

  const verified = verifySignedGuestSessionToken(token, {
    secret: SECRET,
    now: () => new Date("2026-04-11T10:11:00.000Z"),
  })

  expect(verified).toBeNull()
})

test("resolveGuestSession persists valid cookie session", async () => {
  const payload = {
    guestId: "gst_cookie_1",
    issuedAt: Date.parse("2026-04-11T10:00:00.000Z"),
    expiresAt: Date.parse("2026-04-11T11:00:00.000Z"),
  }
  const token = createSignedGuestSessionToken(payload)
  const persistGuestSession = vi.fn().mockResolvedValue(undefined)

  const result = await resolveGuestSession({
    cookieStore: {
      get: () => ({ value: token }),
    },
    now: () => new Date("2026-04-11T10:30:00.000Z"),
    persistGuestSession,
  })

  expect(result).toEqual({
    guestId: payload.guestId,
    created: false,
    fromCookie: true,
  })
  expect(persistGuestSession).toHaveBeenCalledWith(
    payload.guestId,
    new Date(payload.expiresAt)
  )
})

test("resolveGuestSession does not create when ensureGuestSession is false", async () => {
  const persistGuestSession = vi.fn().mockResolvedValue(undefined)

  const result = await resolveGuestSession({
    ensureGuestSession: false,
    cookieStore: {
      get: () => undefined,
    },
    persistGuestSession,
  })

  expect(result).toEqual({
    guestId: null,
    created: false,
    fromCookie: false,
  })
  expect(persistGuestSession).not.toHaveBeenCalled()
})
