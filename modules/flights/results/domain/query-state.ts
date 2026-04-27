import { z } from "zod"

import {
  SLIDER_TIME_MAX,
  SLIDER_TIME_MIN,
} from "@/modules/flights/search/domain"
import { normalizeSelectedStrings } from "@/lib/shared/selection"
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

const legSchema = z.coerce.number().int().min(0)
const selectedSchema = z.string()
const sortSchema = z.enum(RESULTS_SORT_OPTIONS)
const stopsSchema = z.enum(STOPS_FILTER_OPTIONS)
const timePointSchema = z.coerce.number().int().min(SLIDER_TIME_MIN).max(SLIDER_TIME_MAX)
const optionalTextSchema = z.string().trim()

type SearchParamInput = Record<string, string | string[] | undefined>

export function parseResultsUrlState(searchParams: SearchParamInput): ResultsUrlState {
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

  const result: ResultsUrlState = {
    leg: parseField(legSchema, normalized.leg, 0),
    selected: parseSelected(normalized.selected),
    sort: parseField(sortSchema, normalized.sort, "least_expensive"),
    stops: parseField(stopsSchema, normalized.stops, "any"),
    airline: parseOptionalText(normalized.airline),
    flightNumber: parseOptionalText(normalized.flightNumber),
    takeoffFrom: parseField(timePointSchema, normalized.takeoffFrom, SLIDER_TIME_MIN),
    takeoffTo: parseField(timePointSchema, normalized.takeoffTo, SLIDER_TIME_MAX),
    landingFrom: parseField(timePointSchema, normalized.landingFrom, SLIDER_TIME_MIN),
    landingTo: parseField(timePointSchema, normalized.landingTo, SLIDER_TIME_MAX),
    after: parseOptionalText(normalized.after),
  }

  if (result.takeoffFrom > result.takeoffTo) {
    result.takeoffTo = SLIDER_TIME_MAX
  }

  if (result.landingFrom > result.landingTo) {
    result.landingTo = SLIDER_TIME_MAX
  }

  return result
}

export function toResultsUrlSearchParams(state: ResultsUrlState): URLSearchParams {
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
    return normalizeSelectedStrings(value).join(",")
  }

  return value
}

function parseField<T>(
  schema: z.ZodType<T>,
  value: string | undefined,
  fallback: T
): T {
  const parsed = schema.safeParse(value)

  if (!parsed.success) {
    return fallback
  }

  return parsed.data
}

function parseOptionalText(value: string | undefined) {
  const parsed = optionalTextSchema.safeParse(value)

  if (!parsed.success) {
    return undefined
  }

  return parsed.data.length > 0 ? parsed.data : undefined
}

function parseSelected(value: string | undefined) {
  const parsed = selectedSchema.safeParse(value ?? "")

  if (!parsed.success) {
    return []
  }

  return parsed.data
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
}
