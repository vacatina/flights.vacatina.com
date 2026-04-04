"use server"

import { ZodError, type ZodIssue } from "zod"

import {
  parseFlightSearchForm,
  parsePlaceSearchInput,
  toFlightSearchCommand,
} from "@/modules/flights/search/domain"
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

interface SearchPlacesDeps {
  searchPlaces: (query: string) => Promise<PlaceSuggestionOption[]>
  logError: (context: string, error: unknown) => void
}

interface SubmitFlightSearchDeps {
  createPartialOfferRequest: (
    formValues: FlightSearchFormValues,
    command: FlightSearchCommand
  ) => Promise<{ partialOfferRequestId: string }>
  logError: (context: string, error: unknown) => void
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
  const parsed = parsePlaceSearchInput(input)

  if (!parsed.success) {
    return actionFailure(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid place search input"
    )
  }

  try {
    const suggestions = await deps.searchPlaces(parsed.data.query)
    return actionSuccess(suggestions)
  } catch (error) {
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
  const parsed = parseFlightSearchForm(input)

  if (!parsed.success) {
    const fieldErrors = mapIssuesToFieldErrors(parsed.error)

    return actionFailure(
      "VALIDATION_ERROR",
      formatValidationErrors(parsed.error),
      fieldErrors
    )
  }

  if (parsed.data.journeyType === "multi_city") {
    return actionFailure(
      "VALIDATION_ERROR",
      "Multi-city search is temporarily unavailable.",
      {
        journeyType: "Multi-city search is temporarily unavailable.",
      }
    )
  }

  const command = toFlightSearchCommand(parsed.data)
  try {
    const result = await deps.createPartialOfferRequest(parsed.data, command)
    return actionSuccess(result)
  } catch (error) {
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
  console.error(context, error)
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

  const response = await client.partialOfferRequests.create({
    cabin_class: command.cabinClass,
    max_connections: config.partialOfferCreateMaxConnections,
    supplier_timeout: config.partialOfferCreateSupplierTimeoutMs,
    passengers: toDuffelPassengers(formValues.passengers),
    slices: command.slices.map((slice) => ({
      origin: slice.originIataCode,
      destination: slice.destinationIataCode,
      departure_date: slice.departureDate,
      departure_time: toDuffelTimeRange(slice.departureTime),
      arrival_time: toDuffelTimeRange(slice.arrivalTime),
    })),
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
