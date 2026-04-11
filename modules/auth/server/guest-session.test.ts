import { expect, test } from "vitest"

import {
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
