"use server"

import { ZodError, type ZodIssue } from "zod"

import { getActorContext } from "@/modules/auth/server"
import {
  parseFlightSearchForm,
  parsePlaceSearchInput,
  toFlightSearchCommand,
} from "@/modules/flights/search/domain"
import type { ActorContext } from "@/modules/auth/types"
import type {
  FlightSearchCommand,
  FlightSearchFormValues,
  PlaceSuggestionOption,
  TimeRangeInput,
} from "@/modules/flights/search/domain"
import {
  actionFailure,
  actionSuccess,
  type ActionFieldErrors,
  type ActionResult,
} from "@/modules/flights/search/server/types"
import {
  logFlightFlow,
  logFlightFlowError,
} from "@/modules/flights/shared/flow-debug"

interface SearchPlacesDeps {
  searchPlaces: (query: string) => Promise<PlaceSuggestionOption[]>
  logError: (context: string, error: unknown) => void
  getActorContext?: () => Promise<ActorContext>
}

interface SubmitFlightSearchDeps {
  createPartialOfferRequest: (
    formValues: FlightSearchFormValues,
    command: FlightSearchCommand
  ) => Promise<{ partialOfferRequestId: string }>
  logError: (context: string, error: unknown) => void
  getActorContext?: () => Promise<ActorContext>
}

export async function searchPlacesAction(
  input: unknown
): Promise<ActionResult<PlaceSuggestionOption[]>> {
  return executeSearchPlacesAction(input)
}

export async function submitFlightSearchAction(
  input: unknown
): Promise<ActionResult<{ partialOfferRequestId: string }>> {
  return executeSubmitFlightSearchAction(input)
}

export async function executeSearchPlacesAction(
  input: unknown,
  deps: SearchPlacesDeps = {
    searchPlaces: defaultSearchPlaces,
    logError: defaultLogError,
  }
): Promise<ActionResult<PlaceSuggestionOption[]>> {
  const actor = await resolveActionActorContext(deps.getActorContext)
  logFlightFlow("searchPlacesAction", "received_input", {
    inputType: typeof input,
    actorType: actor.type,
  })
  const parsed = parsePlaceSearchInput(input)

  if (!parsed.success) {
    logFlightFlow("searchPlacesAction", "validation_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return actionFailure(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid place search input"
    )
  }

  logFlightFlow("searchPlacesAction", "validated_input", {
    queryLength: parsed.data.query.length,
  })

  try {
    const suggestions = await deps.searchPlaces(parsed.data.query)
    logFlightFlow("searchPlacesAction", "search_success", {
      queryLength: parsed.data.query.length,
      suggestionCount: suggestions.length,
    })
    return actionSuccess(suggestions)
  } catch (error) {
    logFlightFlowError("searchPlacesAction", "search_failed", error, {
      queryLength: parsed.data.query.length,
    })
    deps.logError("[flights/searchPlacesAction]", error)

    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not search airports and cities right now."
    )
  }
}

export async function executeSubmitFlightSearchAction(
  input: unknown,
  deps: SubmitFlightSearchDeps = {
    createPartialOfferRequest: defaultCreatePartialOfferRequest,
    logError: defaultLogError,
  }
): Promise<ActionResult<{ partialOfferRequestId: string }>> {
  const actor = await resolveActionActorContext(deps.getActorContext)
  logFlightFlow("submitFlightSearchAction", "received_input", {
    inputType: typeof input,
    actorType: actor.type,
  })
  const parsed = parseFlightSearchForm(input)

  if (!parsed.success) {
    const fieldErrors = mapIssuesToFieldErrors(parsed.error)
    logFlightFlow("submitFlightSearchAction", "validation_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
      fieldErrorCount: fieldErrors ? Object.keys(fieldErrors).length : 0,
    })

    return actionFailure(
      "VALIDATION_ERROR",
      formatValidationErrors(parsed.error),
      fieldErrors
    )
  }

  if (parsed.data.journeyType === "multi_city") {
    logFlightFlow("submitFlightSearchAction", "blocked_multi_city", {
      journeyType: parsed.data.journeyType,
    })
    return actionFailure(
      "VALIDATION_ERROR",
      "Multi-city search is temporarily unavailable.",
      {
        journeyType: "Multi-city search is temporarily unavailable.",
      }
    )
  }

  const command = toFlightSearchCommand(parsed.data)
  logFlightFlow("submitFlightSearchAction", "mapped_command", {
    journeyType: command.journeyType,
    cabinClass: command.cabinClass,
    sliceCount: command.slices.length,
    passengerAdults: parsed.data.passengers.adults,
    passengerChildren: parsed.data.passengers.children,
  })
  try {
    const result = await deps.createPartialOfferRequest(parsed.data, command)
    logFlightFlow("submitFlightSearchAction", "partial_offer_request_created", {
      partialOfferRequestId: result.partialOfferRequestId,
    })
    return actionSuccess(result)
  } catch (error) {
    logFlightFlowError("submitFlightSearchAction", "partial_offer_request_failed", error, {
      journeyType: command.journeyType,
      sliceCount: command.slices.length,
    })
    deps.logError("[flights/submitFlightSearchAction]", error)

    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not start your flight search right now. Please try again."
    )
  }
}

function formatValidationErrors(error: ZodError) {
  return error.issues
    .map((issue) => formatIssueMessage(issue))
    .filter((message, index, all) => all.indexOf(message) === index)
    .join(" ")
}

function mapIssuesToFieldErrors(error: ZodError): ActionFieldErrors | undefined {
  const fieldErrors: ActionFieldErrors = {}

  for (const issue of error.issues) {
    const fieldPath = toFieldPath(issue.path)

    if (!fieldPath || fieldErrors[fieldPath]) {
      continue
    }

    fieldErrors[fieldPath] = formatIssueMessage(issue)
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
}

function toFieldPath(path: readonly (string | number | symbol)[]) {
  const segments = path.filter(
    (segment): segment is string | number =>
      typeof segment === "string" || typeof segment === "number"
  )

  if (segments.length === 0) {
    return null
  }

  return segments.map((segment) => String(segment)).join(".")
}

function formatIssueMessage(issue: ZodIssue) {
  const first = issue.path[0]
  const second = issue.path[1]
  const third = issue.path[2]

  if (first === "slices" && typeof second === "number") {
    const flightNumber = second + 1

    if (third === "origin") {
      return `Flight ${flightNumber}: origin is required.`
    }

    if (third === "destination") {
      return `Flight ${flightNumber}: destination is required.`
    }

    if (third === "departureDate") {
      return `Flight ${flightNumber}: ${issue.message}.`
    }
  }

  if (first === "passengers") {
    return `Passengers: ${issue.message}.`
  }

  return issue.message.endsWith(".") ? issue.message : `${issue.message}.`
}

function defaultLogError(context: string, error: unknown) {
  logFlightFlowError("search.server", "default_log_error", error, { context })
  console.error(context, error)
}

async function resolveActionActorContext(
  resolveActor?: () => Promise<ActorContext>
): Promise<ActorContext> {
  try {
    return await (resolveActor?.() ?? getActorContext())
  } catch (error) {
    logFlightFlowError("search.actions", "resolve_actor_fallback_to_guest", error)
    return {
      type: "guest",
      guestId: "guest_unavailable",
    }
  }
}

async function defaultSearchPlaces(query: string) {
  const { searchPlaceSuggestions } = await import(
    "@/modules/flights/search/server/places"
  )

  return searchPlaceSuggestions(query)
}

async function defaultCreatePartialOfferRequest(
  formValues: FlightSearchFormValues,
  command: FlightSearchCommand
): Promise<{ partialOfferRequestId: string }> {
  const { getDuffelClient, getDuffelFlightConfig } = await import("@/lib/duffel")
  const client = getDuffelClient()
  const config = getDuffelFlightConfig()

  const passengers = toDuffelPassengers(formValues.passengers)
  const slices = command.slices.map((slice) => ({
    origin: slice.originIataCode,
    destination: slice.destinationIataCode,
    departure_date: slice.departureDate,
    departure_time: toDuffelTimeRange(slice.departureTime),
    arrival_time: toDuffelTimeRange(slice.arrivalTime),
  }))

  logFlightFlow("submitFlightSearchAction", "creating_partial_offer_request", {
    cabinClass: command.cabinClass,
    maxConnections: config.partialOfferCreateMaxConnections,
    supplierTimeoutMs: config.partialOfferCreateSupplierTimeoutMs,
    passengerCount: passengers.length,
    sliceCount: slices.length,
  })

  const response = await client.partialOfferRequests.create({
    cabin_class: command.cabinClass,
    max_connections: config.partialOfferCreateMaxConnections,
    supplier_timeout: config.partialOfferCreateSupplierTimeoutMs,
    passengers,
    slices,
  })

  logFlightFlow("submitFlightSearchAction", "created_partial_offer_request", {
    partialOfferRequestId: response.data.id,
  })

  return {
    partialOfferRequestId: response.data.id,
  }
}

function toDuffelPassengers(values: FlightSearchFormValues["passengers"]) {
  const adults = Array.from({ length: values.adults }, () => ({ type: "adult" as const }))
  const children = values.childrenAges.map((age) => ({ age }))

  return [...adults, ...children]
}

function toDuffelTimeRange(value: TimeRangeInput | null) {
  if (!value) {
    return null
  }

  return {
    from: value.from,
    to: value.to,
  }
}
