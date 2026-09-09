"use server"

import { z } from "zod"
import { resolveActionActorContext } from "@/modules/auth/server"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import { getLiteApiClient } from "@/lib/liteapi/client"

const prebookHotelSchema = z.object({
  offerId: z.string().min(1),
})

export async function prebookHotelAction(
  input: unknown
): Promise<ActionResult<{ prebookId: string }>> {
  let actor
  try {
    actor = await resolveActionActorContext({
      scope: "hotels.prebook.actions",
    })
  } catch (error) {
    logHotelFlowError("prebookHotelAction", "actor_resolution_failed", error, {
      inputType: typeof input,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not verify the current session. Please refresh and try again."
    )
  }

  logHotelFlow("prebookHotelAction", "received_input", {
    inputType: typeof input,
    actorType: actor.type,
  })

  const parsed = prebookHotelSchema.safeParse(input)

  if (!parsed.success) {
    logHotelFlow("prebookHotelAction", "validation_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return actionFailure("VALIDATION_ERROR", "Invalid prebook request")
  }

  try {
    const client = getLiteApiClient()
    
    // Call LiteAPI post_rates_prebook endpoint
    logHotelFlow("prebookHotelAction", "prebook_started", {
      offerId: parsed.data.offerId,
    })
    
    const response = await client.post<{ data?: { prebookId: string }; [key: string]: any }>(
      "/rates/prebook",
      {
        offerId: parsed.data.offerId,
        usePaymentSdk: false
      }
    )

    if (!response.data?.prebookId) {
      throw new Error("Missing prebookId from LiteAPI response")
    }

    logHotelFlow("prebookHotelAction", "prebook_succeeded", {
      offerId: parsed.data.offerId,
      prebookId: response.data.prebookId,
    })

    return actionSuccess({
      prebookId: response.data.prebookId,
    })
  } catch (error) {
    logHotelFlowError("prebookHotelAction", "prebook_failed", error, {
      offerId: parsed.data.offerId,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not prebook this room right now. It might be sold out. Please try again or select another room."
    )
  }
}
