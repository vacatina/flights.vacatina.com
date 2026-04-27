import type { ActorContext } from "@/modules/auth/types"
import { getActorContext } from "@/modules/auth/server/actor"
import { GUEST_UNAVAILABLE_ID } from "@/modules/auth/constants"
import { logFlightFlowError } from "@/lib/logging/flow-debug"

interface ResolveActionActorContextInput {
  scope: string
  resolveActor?: () => Promise<ActorContext>
}

export async function resolveActionActorContext(
  input: ResolveActionActorContextInput
): Promise<ActorContext> {
  try {
    return await (input.resolveActor?.() ?? getActorContext())
  } catch (error) {
    logFlightFlowError(input.scope, "resolve_actor_fallback_to_guest", error)
    return {
      type: "guest",
      guestId: GUEST_UNAVAILABLE_ID,
    }
  }
}
