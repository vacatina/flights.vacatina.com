import { beforeEach, expect, test, vi } from "vitest"

const mockFns = vi.hoisted(() => ({
  getClerkAuthState: vi.fn(),
  resolveGuestSession: vi.fn(),
  findGuestSessionLink: vi.fn(),
  findUserByClerkUserId: vi.fn(),
  linkGuestSessionToUser: vi.fn(),
  upsertUserMirror: vi.fn(),
  logFlightFlow: vi.fn(),
  logFlightFlowError: vi.fn(),
}))

vi.mock("@/modules/auth/server/clerk", () => ({
  getClerkAuthState: mockFns.getClerkAuthState,
}))

vi.mock("@/modules/auth/server/guest-session", () => ({
  resolveGuestSession: mockFns.resolveGuestSession,
}))

vi.mock("@/modules/auth/server/repository", () => ({
  findGuestSessionLink: mockFns.findGuestSessionLink,
  findUserByClerkUserId: mockFns.findUserByClerkUserId,
  linkGuestSessionToUser: mockFns.linkGuestSessionToUser,
  upsertUserMirror: mockFns.upsertUserMirror,
}))

vi.mock("@/lib/logging/flow-debug", () => ({
  logFlightFlow: mockFns.logFlightFlow,
  logFlightFlowError: mockFns.logFlightFlowError,
}))

import { getActorContext } from "@/modules/auth/server/actor"

beforeEach(() => {
  vi.clearAllMocks()

  mockFns.getClerkAuthState.mockResolvedValue({
    isAuthenticated: true,
    userId: "clerk_user_1",
    orgId: null,
  })
  mockFns.resolveGuestSession.mockResolvedValue({
    guestId: "gst_cookie_1",
    created: false,
    fromCookie: true,
  })
  mockFns.findUserByClerkUserId.mockResolvedValue({
    id: "usr_1",
    clerkUserId: "clerk_user_1",
    primaryEmail: null,
    firstName: null,
    lastName: null,
    imageUrl: null,
    createdAt: new Date("2026-04-24T00:00:00.000Z"),
    updatedAt: new Date("2026-04-24T00:00:00.000Z"),
  })
  mockFns.findGuestSessionLink.mockResolvedValue(false)
  mockFns.linkGuestSessionToUser.mockResolvedValue(undefined)
  mockFns.upsertUserMirror.mockResolvedValue({
    id: "usr_1",
    clerkUserId: "clerk_user_1",
    primaryEmail: null,
    firstName: null,
    lastName: null,
    imageUrl: null,
    createdAt: new Date("2026-04-24T00:00:00.000Z"),
    updatedAt: new Date("2026-04-24T00:00:00.000Z"),
  })
})

test("getActorContext returns user actor even when guest link insert fails", async () => {
  mockFns.linkGuestSessionToUser.mockRejectedValue(
    new Error("fk violation: guest_session_id missing")
  )

  const actor = await getActorContext({
    ensureGuestSession: false,
  })

  expect(actor).toEqual({
    type: "user",
    clerkUserId: "clerk_user_1",
    appUserId: "usr_1",
  })
  expect(mockFns.logFlightFlowError).toHaveBeenCalled()
})

test("getActorContext resolves guest actor for signed-out users", async () => {
  mockFns.getClerkAuthState.mockResolvedValue({
    isAuthenticated: false,
    userId: null,
    orgId: null,
  })

  const actor = await getActorContext({
    ensureGuestSession: true,
  })

  expect(actor).toEqual({
    type: "guest",
    guestId: "gst_cookie_1",
  })
})
