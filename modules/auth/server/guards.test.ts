import { expect, test, vi } from "vitest"

import { AuthenticationRequiredError, requireAuthenticatedActor } from "@/modules/auth/server/guards"

const getActorContextMock = vi.fn<
  () => Promise<
    | { type: "user"; clerkUserId: string; appUserId: string }
    | { type: "guest"; guestId: string }
  >
>()

vi.mock("@/modules/auth/server/actor", () => ({
  getActorContext: () => getActorContextMock(),
}))

test("requireAuthenticatedActor returns user actor when signed in", async () => {
  getActorContextMock.mockResolvedValueOnce({
    type: "user",
    clerkUserId: "user_123",
    appUserId: "usr_123",
  })

  const actor = await requireAuthenticatedActor()

  expect(actor).toEqual({
    type: "user",
    clerkUserId: "user_123",
    appUserId: "usr_123",
  })
})

test("requireAuthenticatedActor throws when actor is guest", async () => {
  getActorContextMock.mockResolvedValueOnce({
    type: "guest",
    guestId: "gst_123",
  })

  await expect(requireAuthenticatedActor()).rejects.toBeInstanceOf(
    AuthenticationRequiredError
  )
})
