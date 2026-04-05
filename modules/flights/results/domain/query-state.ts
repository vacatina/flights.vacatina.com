import { z } from "zod"

import {
  SLIDER_TIME_MAX,
  SLIDER_TIME_MIN,
} from "@/modules/flights/search/domain"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"
import type {
  ResultsUrlState,
  StopsFilterOption,
  ResultsSortOption,
} from "@/modules/flights/results/domain/types"

const RESULTS_SORT_OPTIONS: ResultsSortOption[] = [
  "least_expensive",
  "most_expensive",
  "shortest_duration",
  "longest_duration",
]

const STOPS_FILTER_OPTIONS: StopsFilterOption[] = [
  "direct",
  "max_1",
  "max_2",
  "any",
]

const resultsQuerySchema = z
  .object({
    leg: z.coerce.number().int().min(0).default(0),
    selected: z.string().optional().default(""),
    sort: z.enum(RESULTS_SORT_OPTIONS).default("least_expensive"),
    stops: z.enum(STOPS_FILTER_OPTIONS).default("any"),
    airline: z.string().trim().optional(),
    flightNumber: z.string().trim().optional(),
    takeoffFrom: z
      .coerce.number()
      .int()
      .min(SLIDER_TIME_MIN)
      .max(SLIDER_TIME_MAX)
      .default(SLIDER_TIME_MIN),
    takeoffTo: z
      .coerce.number()
      .int()
      .min(SLIDER_TIME_MIN)
      .max(SLIDER_TIME_MAX)
      .default(SLIDER_TIME_MAX),
    landingFrom: z
      .coerce.number()
      .int()
      .min(SLIDER_TIME_MIN)
      .max(SLIDER_TIME_MAX)
      .default(SLIDER_TIME_MIN),
    landingTo: z
      .coerce.number()
      .int()
      .min(SLIDER_TIME_MIN)
      .max(SLIDER_TIME_MAX)
      .default(SLIDER_TIME_MAX),
    after: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.takeoffFrom > value.takeoffTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["takeoffTo"],
        message: "Take-off range is invalid",
      })
    }

    if (value.landingFrom > value.landingTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["landingTo"],
        message: "Landing range is invalid",
      })
    }
  })

type SearchParamInput = Record<string, string | string[] | undefined>

export function parseResultsUrlState(searchParams: SearchParamInput): ResultsUrlState {
  logFlightFlow("parseResultsUrlState", "received_search_params", {
    keys: Object.keys(searchParams),
  })

  const normalized = {
    leg: firstValue(searchParams.leg),
    selected: normalizeSelected(searchParams.selected),
    sort: firstValue(searchParams.sort),
    stops: firstValue(searchParams.stops),
    airline: firstValue(searchParams.airline),
    flightNumber: firstValue(searchParams.flightNumber),
    takeoffFrom: firstValue(searchParams.takeoffFrom),
    takeoffTo: firstValue(searchParams.takeoffTo),
    landingFrom: firstValue(searchParams.landingFrom),
    landingTo: firstValue(searchParams.landingTo),
    after: firstValue(searchParams.after),
  }

  const parsed = resultsQuerySchema.safeParse(normalized)

  if (!parsed.success) {
    logFlightFlow("parseResultsUrlState", "parse_failed_using_defaults", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return {
      leg: 0,
      selected: [],
      sort: "least_expensive",
      stops: "any",
      takeoffFrom: SLIDER_TIME_MIN,
      takeoffTo: SLIDER_TIME_MAX,
      landingFrom: SLIDER_TIME_MIN,
      landingTo: SLIDER_TIME_MAX,
    }
  }

  const result = {
    ...parsed.data,
    airline: parsed.data.airline || undefined,
    flightNumber: parsed.data.flightNumber || undefined,
    selected: parsed.data.selected
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    after: parsed.data.after || undefined,
  }

  logFlightFlow("parseResultsUrlState", "parse_succeeded", {
    leg: result.leg,
    selectedCount: result.selected.length,
    sort: result.sort,
    stops: result.stops,
    hasAirlineFilter: Boolean(result.airline),
    hasFlightNumberFilter: Boolean(result.flightNumber),
    hasAfter: Boolean(result.after),
  })

  return result
}

export function toResultsUrlSearchParams(state: ResultsUrlState): URLSearchParams {
  logFlightFlow("toResultsUrlSearchParams", "serializing_state", {
    leg: state.leg,
    selectedCount: state.selected.length,
    sort: state.sort,
    stops: state.stops,
  })
  const params = new URLSearchParams()

  params.set("leg", String(Math.max(state.leg, 0)))
  params.set("sort", state.sort)
  params.set("stops", state.stops)
  params.set("takeoffFrom", String(state.takeoffFrom))
  params.set("takeoffTo", String(state.takeoffTo))
  params.set("landingFrom", String(state.landingFrom))
  params.set("landingTo", String(state.landingTo))

  if (state.selected.length > 0) {
    params.set("selected", state.selected.join(","))
  }

  if (state.airline) {
    params.set("airline", state.airline)
  }

  if (state.flightNumber) {
    params.set("flightNumber", state.flightNumber)
  }

  if (state.after) {
    params.set("after", state.after)
  }

  logFlightFlow("toResultsUrlSearchParams", "serialized_state", {
    query: params.toString(),
  })
  return params
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function normalizeSelected(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(",")
  }

  return value
}
