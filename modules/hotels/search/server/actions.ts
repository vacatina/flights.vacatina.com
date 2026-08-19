"use server"

import { ZodError, type ZodIssue } from "zod"
import { resolveActionActorContext } from "@/modules/auth/server"
import type { ActorContext } from "@/modules/auth/types"
import { actionFailure, actionSuccess, type ActionResult, type ActionFieldErrors } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import { parseHotelSearchInput, toHotelSearchCommand, type HotelSearchFormValues, type HotelSearchCommand } from "@/modules/hotels/search/domain"
import { searchHotelDestinations, type HotelPlaceSuggestion } from "@/modules/hotels/search/server/places"

interface HotelSearchDeps {
  searchPlaces: (query: string) => Promise<HotelPlaceSuggestion[]>
  getActorContext?: () => Promise<ActorContext>
}

export async function searchHotelDestinationsAction(
  input: { query: string },
  deps: HotelSearchDeps = { searchPlaces: searchHotelDestinations }
): Promise<ActionResult<HotelPlaceSuggestion[]>> {
  try {
    const suggestions = await deps.searchPlaces(input.query)
    return actionSuccess(suggestions)
  } catch (error) {
    logHotelFlowError("searchHotelDestinationsAction", "search_failed", error)
    return actionFailure("UPSTREAM_ERROR", "Could not search destinations right now.")
  }
}

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
    destinationId: command.cityId,
    checkin: command.checkin,
    checkout: command.checkout,
  })

  // Normally, we'd store the search session or redirect. For now, we return the command to the client so it can redirect.
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
