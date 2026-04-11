import { expect, test } from "vitest"

import { resolveActorContext } from "@/modules/auth/server/actor"

test("resolveActorContext prioritizes authenticated user when user and app IDs exist", () => {
  const actor = resolveActorContext({
    clerkUserId: "user_123",
    appUserId: "usr_123",
    guestId: "gst_123",
  })

  expect(actor).toEqual({
    type: "user",
    clerkUserId: "user_123",
    appUserId: "usr_123",
  })
})

test("resolveActorContext falls back to guest when authenticated mapping is incomplete", () => {
  const actor = resolveActorContext({
    clerkUserId: "user_123",
    appUserId: null,
    guestId: "gst_123",
  })

  expect(actor).toEqual({
    type: "guest",
    guestId: "gst_123",
  })
})

test("resolveActorContext returns unavailable guest fallback when no identity exists", () => {
  const actor = resolveActorContext({
    clerkUserId: null,
    appUserId: null,
    guestId: null,
  })

  expect(actor).toEqual({
    type: "guest",
    guestId: "guest_unavailable",
  })
})
