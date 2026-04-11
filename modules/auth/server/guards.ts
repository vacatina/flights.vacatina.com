import { getActorContext } from "@/modules/auth/server/actor"
import type { AuthenticatedActorContext } from "@/modules/auth/types"

export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED"

  constructor(message = "Authentication required.") {
    super(message)
    this.name = "AuthenticationRequiredError"
  }
}

export async function requireAuthenticatedActor() {
  const actor = await getActorContext({
    ensureGuestSession: false,
  })

  if (actor.type !== "user") {
    throw new AuthenticationRequiredError()
  }

  return actor as AuthenticatedActorContext
}
