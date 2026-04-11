import type { ActorContext } from "@/modules/auth/types"
import { getClerkAuthState } from "@/modules/auth/server/clerk"
import {
  findGuestSessionLink,
  findUserByClerkUserId,
  linkGuestSessionToUser,
  upsertUserMirror,
} from "@/modules/auth/server/repository"
import { resolveGuestSession } from "@/modules/auth/server/guest-session"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

interface GetActorContextOptions {
  ensureGuestSession?: boolean
}

interface ResolveActorContextInput {
  clerkUserId: string | null
  appUserId: string | null
  guestId: string | null
}

export async function getActorContext(
  options: GetActorContextOptions = {}
): Promise<ActorContext> {
  const authState = await getClerkAuthState()
  const guestSession = await resolveGuestSession({
    ensureGuestSession: options.ensureGuestSession ?? true,
  })

  if (authState.userId) {
    const existingUser = await findUserByClerkUserId(authState.userId)
    const user =
      existingUser ??
      (await upsertUserMirror({
        clerkUserId: authState.userId,
      }))

    if (guestSession.guestId) {
      const linked = await findGuestSessionLink(guestSession.guestId, user.id)

      if (!linked) {
        await linkGuestSessionToUser({
          guestSessionId: guestSession.guestId,
          userId: user.id,
        })
        logFlightFlow("auth.actor", "guest_linked", {
          guestId: guestSession.guestId,
          appUserId: user.id,
          clerkUserId: authState.userId,
        })
      }
    }

    const actor = resolveActorContext({
      clerkUserId: authState.userId,
      appUserId: user.id,
      guestId: guestSession.guestId,
    })

    logFlightFlow("auth.actor", "user_resolved", {
      clerkUserId: authState.userId,
      appUserId: user.id,
      guestCreated: guestSession.created,
    })

    return actor
  }

  const actor = resolveActorContext({
    clerkUserId: null,
    appUserId: null,
    guestId: guestSession.guestId,
  })

  logFlightFlow("auth.actor", "guest_resolved", {
    guestId: actor.type === "guest" ? actor.guestId : null,
    guestCreated: guestSession.created,
  })

  return actor
}

export function resolveActorContext(input: ResolveActorContextInput): ActorContext {
  if (input.clerkUserId && input.appUserId) {
    return {
      type: "user",
      clerkUserId: input.clerkUserId,
      appUserId: input.appUserId,
    }
  }

  if (input.guestId) {
    return {
      type: "guest",
      guestId: input.guestId,
    }
  }

  return {
    type: "guest",
    guestId: "guest_unavailable",
  }
}
