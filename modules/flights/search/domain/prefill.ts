import type { OfferRequest } from "@duffel/api/types"
import { z } from "zod"

import {
  CABIN_CLASSES,
  MAX_CHILD_AGE,
  MAX_MULTI_CITY_SLICES,
  MAX_TOTAL_PASSENGERS,
  MIN_ADULTS,
  MIN_CHILD_AGE,
} from "@/modules/flights/search/domain/constants"
import {
  createDefaultFlightSearchValues,
} from "@/modules/flights/search/domain/defaults"
import { formatPlaceDisplayName } from "@/modules/flights/search/domain/mappers"
import { parseFlightSearchForm } from "@/modules/flights/search/domain/schema"
import type {
  CabinClass,
  FlightSearchFormValues,
  JourneyType,
  PlaceSuggestionOption,
  TimeRangeInput,
} from "@/modules/flights/search/domain/types"

const SEARCH_PREFILL_VERSION = 1
const MAX_PREFILL_TOKEN_LENGTH = 3_072
const TIME_RANGE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

const placeSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(["airport", "city"]),
  iataCode: z.string().trim().length(3),
  iataCityCode: z.string().trim().length(3).nullable(),
  name: z.string().trim().min(1),
  cityName: z.string().trim().min(1).nullable(),
  countryCode: z.string().trim().length(2),
  countryName: z.string().trim().min(1).nullable(),
  displayName: z.string().trim().min(1),
})

const timeRangeSchema = z.object({
  from: z.string().regex(TIME_RANGE_PATTERN, "Use HH:mm format"),
  to: z.string().regex(TIME_RANGE_PATTERN, "Use HH:mm format"),
})

const prefillPayloadSchema = z.object({
  v: z.literal(SEARCH_PREFILL_VERSION),
  journeyType: z.enum(["one_way", "return", "multi_city"]),
  cabinClass: z.enum(CABIN_CLASSES),
  passengers: z.object({
    adults: z.number().int().min(MIN_ADULTS),
    children: z.number().int().min(0),
    childrenAges: z.array(z.number().int().min(MIN_CHILD_AGE).max(MAX_CHILD_AGE)),
  }),
  slices: z
    .array(
      z.object({
        origin: placeSchema.nullable(),
        destination: placeSchema.nullable(),
        departureDate: z.string().trim().min(1),
        departureTime: timeRangeSchema.nullable(),
        arrivalTime: timeRangeSchema.nullable(),
      })
    )
    .min(1)
    .max(MAX_MULTI_CITY_SLICES),
})

type SearchPrefillPayload = z.infer<typeof prefillPayloadSchema>

export function parseSearchPrefillToken(
  prefillToken: string | undefined | null
): FlightSearchFormValues | null {
  if (!prefillToken || prefillToken.length > MAX_PREFILL_TOKEN_LENGTH) {
    return null
  }

  let parsedJson: unknown

  try {
    parsedJson = JSON.parse(decodeBase64Url(prefillToken))
  } catch {
    return null
  }

  const payload = prefillPayloadSchema.safeParse(parsedJson)

  if (!payload.success) {
    return null
  }

  const values = payloadToFlightSearchValues(payload.data)
  const parsedValues = parseFlightSearchForm(values)

  if (!parsedValues.success) {
    return null
  }

  return parsedValues.data
}

export function createSearchPrefillToken(
  values: FlightSearchFormValues
): string | null {
  const parsedValues = parseFlightSearchForm(values)

  if (!parsedValues.success) {
    return null
  }

  const payload: SearchPrefillPayload = {
    v: SEARCH_PREFILL_VERSION,
    journeyType: parsedValues.data.journeyType,
    cabinClass: parsedValues.data.cabinClass,
    passengers: parsedValues.data.passengers,
    slices: parsedValues.data.slices.map((slice) => ({
      origin: slice.origin ? sanitizePlace(slice.origin) : null,
      destination: slice.destination ? sanitizePlace(slice.destination) : null,
      departureDate: slice.departureDate,
      departureTime: sanitizeTimeRange(slice.departureTime),
      arrivalTime: sanitizeTimeRange(slice.arrivalTime),
    })),
  }
  const encoded = encodeBase64Url(JSON.stringify(payload))

  return encoded.length <= MAX_PREFILL_TOKEN_LENGTH ? encoded : null
}

export function createSearchPrefillHrefFromOfferRequest(
  offerRequest: OfferRequest
): string {
  const values = mapOfferRequestToFlightSearchValues(offerRequest)

  if (!values) {
    return "/"
  }

  const token = createSearchPrefillToken(values)

  if (!token) {
    return "/"
  }

  return `/?prefill=${encodeURIComponent(token)}`
}

export function mapOfferRequestToFlightSearchValues(
  offerRequest: OfferRequest
): FlightSearchFormValues | null {
  const slices = (offerRequest.slices ?? [])
    .slice(0, MAX_MULTI_CITY_SLICES)
    .map((slice) => {
      const sliceValue = slice as typeof slice & {
        departure_time?: unknown
        arrival_time?: unknown
      }

      return {
      origin: mapOfferPlace(
        slice.origin,
        slice.origin_type === "city" ? "city" : "airport"
      ),
      destination: mapOfferPlace(
        slice.destination,
        slice.destination_type === "city" ? "city" : "airport"
      ),
      departureDate:
        typeof slice.departure_date === "string" ? slice.departure_date : "",
      departureTime: mapTimeRange(sliceValue.departure_time),
      arrivalTime: mapTimeRange(sliceValue.arrival_time),
    }
    })

  if (slices.length === 0) {
    return null
  }

  const journeyType = inferJourneyType(slices.length)
  const cabinClass = normalizeCabinClass(offerRequest.cabin_class)
  const passengers = mapPassengers(offerRequest)

  const values: FlightSearchFormValues = {
    journeyType,
    cabinClass,
    passengers,
    slices:
      journeyType === "one_way"
        ? slices.slice(0, 1)
        : journeyType === "return"
          ? slices.slice(0, 2)
          : slices,
  }

  const parsed = parseFlightSearchForm(values)

  if (parsed.success) {
    return parsed.data
  }

  const fallback = createDefaultFlightSearchValues()
  fallback.journeyType = journeyType
  fallback.cabinClass = cabinClass
  fallback.passengers = passengers
  fallback.slices = values.slices

  const parsedFallback = parseFlightSearchForm(fallback)

  return parsedFallback.success ? parsedFallback.data : null
}

function payloadToFlightSearchValues(
  payload: SearchPrefillPayload
): FlightSearchFormValues {
  return {
    journeyType: payload.journeyType,
    cabinClass: payload.cabinClass,
    passengers: payload.passengers,
    slices: payload.slices.map((slice) => ({
      origin: slice.origin,
      destination: slice.destination,
      departureDate: slice.departureDate,
      departureTime: slice.departureTime ?? null,
      arrivalTime: slice.arrivalTime ?? null,
    })),
  }
}

function inferJourneyType(sliceCount: number): JourneyType {
  if (sliceCount <= 1) {
    return "one_way"
  }

  if (sliceCount === 2) {
    return "return"
  }

  return "multi_city"
}

function normalizeCabinClass(value: unknown): CabinClass {
  if (typeof value === "string" && CABIN_CLASSES.includes(value as CabinClass)) {
    return value as CabinClass
  }

  return "economy"
}

function mapPassengers(
  offerRequest: Pick<OfferRequest, "passengers">
): FlightSearchFormValues["passengers"] {
  const passengers = offerRequest.passengers ?? []
  const childAges: number[] = []
  let adults = 0

  for (const passenger of passengers) {
    const type = typeof passenger.type === "string" ? passenger.type : null
    const age = normalizeAge((passenger as { age?: unknown }).age)
    const isChild =
      type === "child" ||
      type === "infant_without_seat" ||
      (age !== null && age >= MIN_CHILD_AGE && age <= MAX_CHILD_AGE)

    if (isChild) {
      childAges.push(age ?? 11)
      continue
    }

    adults += 1
  }

  if (adults < MIN_ADULTS) {
    adults = MIN_ADULTS
  }

  if (adults > MAX_TOTAL_PASSENGERS) {
    adults = MAX_TOTAL_PASSENGERS
  }

  const maxChildren = Math.max(0, MAX_TOTAL_PASSENGERS - adults)
  const childrenAges = childAges.slice(0, maxChildren)

  return {
    adults,
    children: childrenAges.length,
    childrenAges,
  }
}

function normalizeAge(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }

  const normalized = Math.floor(value)

  if (normalized < MIN_CHILD_AGE || normalized > MAX_CHILD_AGE) {
    return null
  }

  return normalized
}

function mapOfferPlace(
  place: unknown,
  fallbackType: PlaceSuggestionOption["type"]
): PlaceSuggestionOption | null {
  if (!place || typeof place !== "object") {
    return null
  }

  const placeValue = place as Record<string, unknown>
  const iataCode = normalizeIataCode(placeValue.iata_code)

  if (!iataCode) {
    return null
  }

  const type = fallbackType
  const name = normalizeString(placeValue.name) ?? iataCode
  const cityName = normalizeString(placeValue.city_name)
  const countryCode = normalizeCountryCode(placeValue.iata_country_code)
  const option: PlaceSuggestionOption = {
    id: normalizeString(placeValue.id) ?? `${type}_${iataCode.toLowerCase()}`,
    type,
    iataCode,
    iataCityCode: normalizeIataCode(placeValue.iata_city_code),
    name,
    cityName,
    countryCode: countryCode ?? "ZZ",
    countryName: normalizeString(placeValue.country_name),
    displayName: "",
  }
  option.displayName = formatPlaceDisplayName(option)

  return option
}

function sanitizePlace(place: PlaceSuggestionOption): PlaceSuggestionOption {
  return {
    id: place.id,
    type: place.type,
    iataCode: place.iataCode,
    iataCityCode: place.iataCityCode,
    name: place.name,
    cityName: place.cityName,
    countryCode: place.countryCode,
    countryName: place.countryName,
    displayName: place.displayName,
  }
}

function mapTimeRange(value: unknown): TimeRangeInput | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const range = value as Record<string, unknown>
  const from = normalizeString(range.from)
  const to = normalizeString(range.to)

  if (!from || !to || !TIME_RANGE_PATTERN.test(from) || !TIME_RANGE_PATTERN.test(to)) {
    return null
  }

  return { from, to }
}

function sanitizeTimeRange(value: TimeRangeInput | null): TimeRangeInput | null {
  if (!value) {
    return null
  }

  if (!TIME_RANGE_PATTERN.test(value.from) || !TIME_RANGE_PATTERN.test(value.to)) {
    return null
  }

  return {
    from: value.from,
    to: value.to,
  }
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeIataCode(value: unknown): string | null {
  const normalized = normalizeString(value)?.toUpperCase()
  return normalized && normalized.length === 3 ? normalized : null
}

function normalizeCountryCode(value: unknown): string | null {
  const normalized = normalizeString(value)?.toUpperCase()
  return normalized && normalized.length === 2 ? normalized : null
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded =
    normalized.length % 4 === 0
      ? normalized
      : normalized.padEnd(normalized.length + (4 - (normalized.length % 4)), "=")

  return Buffer.from(padded, "base64").toString("utf-8")
}
