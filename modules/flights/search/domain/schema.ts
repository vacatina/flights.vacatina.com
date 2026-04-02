import { z } from "zod"

import {
  CABIN_CLASSES,
  JOURNEY_TYPES,
  MAX_MULTI_CITY_SLICES,
  MAX_TOTAL_PASSENGERS,
  MIN_ADULTS,
  MIN_MULTI_CITY_SLICES,
} from "@/modules/flights/search/domain/constants"

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/

const placeSuggestionOptionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["airport", "city"]),
  iataCode: z.string().trim().length(3),
  iataCityCode: z.string().trim().length(3).nullable(),
  name: z.string(),
  cityName: z.string().nullable(),
  countryCode: z.string().trim().length(2),
  countryName: z.string().nullable(),
  displayName: z.string().min(1),
})

const timeRangeSchema = z
  .object({
    from: z.string().regex(timePattern, "Use HH:mm format"),
    to: z.string().regex(timePattern, "Use HH:mm format"),
  })
  .refine((value) => toMinutes(value.from) <= toMinutes(value.to), {
    message: "Invalid time range",
    path: ["to"],
  })

const flightSliceSchema = z.object({
  origin: placeSuggestionOptionSchema.nullable(),
  destination: placeSuggestionOptionSchema.nullable(),
  departureDate: z.string().trim().min(1, "Departure date is required"),
  departureTime: timeRangeSchema.nullable(),
  arrivalTime: timeRangeSchema.nullable(),
})

export const flightSearchFormSchema = z
  .object({
    journeyType: z.enum(JOURNEY_TYPES),
    slices: z.array(flightSliceSchema).min(1).max(MAX_MULTI_CITY_SLICES),
    passengers: z.object({
      adults: z.number().int().min(MIN_ADULTS, "At least one adult is required"),
      children: z.number().int().min(0),
    }),
    cabinClass: z.enum(CABIN_CLASSES),
  })
  .superRefine((value, ctx) => {
    const { journeyType, slices } = value

    if (journeyType === "one_way" && slices.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "One-way journey requires exactly one flight",
        path: ["slices"],
      })
    }

    if (journeyType === "return" && slices.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Return journey requires exactly two flights",
        path: ["slices"],
      })
    }

    if (
      journeyType === "multi_city" &&
      (slices.length < MIN_MULTI_CITY_SLICES || slices.length > MAX_MULTI_CITY_SLICES)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Multi-city journey supports ${MIN_MULTI_CITY_SLICES} to ${MAX_MULTI_CITY_SLICES} flights`,
        path: ["slices"],
      })
    }

    if (value.passengers.adults + value.passengers.children > MAX_TOTAL_PASSENGERS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Maximum ${MAX_TOTAL_PASSENGERS} passengers are allowed`,
        path: ["passengers"],
      })
    }

    slices.forEach((slice, index) => {
      if (!slice.origin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Origin is required",
          path: ["slices", index, "origin"],
        })
      }

      if (!slice.destination) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination is required",
          path: ["slices", index, "destination"],
        })
      }

      if (slice.origin && slice.destination && slice.origin.id === slice.destination.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Origin and destination must be different",
          path: ["slices", index, "destination"],
        })
      }

      if (!isIsoDate(slice.departureDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose a valid date",
          path: ["slices", index, "departureDate"],
        })
      }
    })

    if (journeyType === "return" && slices.length === 2) {
      const outbound = toDate(slices[0]?.departureDate)
      const inbound = toDate(slices[1]?.departureDate)

      if (outbound && inbound && inbound < outbound) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return date must be on or after departure date",
          path: ["slices", 1, "departureDate"],
        })
      }
    }

    if (journeyType === "multi_city") {
      for (let index = 1; index < slices.length; index += 1) {
        const previous = toDate(slices[index - 1]?.departureDate)
        const current = toDate(slices[index]?.departureDate)

        if (previous && current && current < previous) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Flight dates must be chronological",
            path: ["slices", index, "departureDate"],
          })
        }
      }
    }
  })

const placeSearchSchema = z.object({
  query: z.string().trim().min(2).max(80),
})

export type FlightSearchFormSchema = z.infer<typeof flightSearchFormSchema>
export type PlaceSearchInput = z.infer<typeof placeSearchSchema>

export function parseFlightSearchForm(values: unknown) {
  return flightSearchFormSchema.safeParse(values)
}

export function parsePlaceSearchInput(values: unknown) {
  return placeSearchSchema.safeParse(values)
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = toDate(value)
  return parsed !== null
}

function toDate(value: string | undefined) {
  if (!value) {
    return null
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}
