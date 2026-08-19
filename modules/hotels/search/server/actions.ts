"use server"

import { ZodError, type ZodIssue } from "zod"
import { resolveActionActorContext } from "@/modules/auth/server"
import type { ActorContext } from "@/modules/auth/types"
import { actionFailure, actionSuccess, type ActionResult, type ActionFieldErrors } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import { parseHotelSearchInput, toHotelSearchCommand, type HotelSearchFormValues, type HotelSearchCommand } from "@/modules/hotels/search/domain"

export async function submitHotelSearchAction(
  input: unknown,
  deps: { getActorContext?: () => Promise<ActorContext> } = {}
): Promise<ActionResult<{ command: HotelSearchCommand }>> {
  const actor = await resolveActionActorContext({
    scope: "hotels.search",
    resolveActor: deps.getActorContext,
  })

  logHotelFlow("submitHotelSearchAction", "received_input", {
    inputType: typeof input,
    actorType: actor.type,
  })

  const parsed = parseHotelSearchInput(input)

  if (!parsed.success) {
    return actionFailure(
      "VALIDATION_ERROR",
      "Invalid hotel search form data",
      mapIssuesToFieldErrors(parsed.error)
    )
  }

  const command = toHotelSearchCommand(parsed.data)
  
  logHotelFlow("submitHotelSearchAction", "mapped_command", {
    placeId: command.placeId,
    checkin: command.checkin,
    checkout: command.checkout,
    occupancies: command.occupancies,
  })

  // We return the command to the client so it can redirect with search params
  return actionSuccess({ command })
}

function mapIssuesToFieldErrors(error: ZodError): ActionFieldErrors | undefined {
  const fieldErrors: ActionFieldErrors = {}
  for (const issue of error.issues) {
    const fieldPath = issue.path.join(".")
    if (fieldPath && !fieldErrors[fieldPath]) {
      fieldErrors[fieldPath] = issue.message
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
}
