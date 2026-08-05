import type { CheckoutAncillaryPayloadMetadata } from "@/modules/flights/checkout/domain"
import { z } from "zod"

export interface CheckoutFormValues {
  paymentMode: "pay_now" | "hold"
  contact: {
    email: string
    phoneNumber: string
  }
  passengers: Array<{
    id: string
    type: "adult" | "child" | "infant_without_seat"
    title: "mr" | "mrs" | "ms" | "miss" | "dr"
    givenName: string
    familyName: string
    bornOn: string
    gender: "m" | "f"
    identityType: "passport" | "tax_id" | "known_traveler_number" | "passenger_redress_number"
    identityNumber: string
    identityCountryCode: string
    identityExpiresOn: string
  }>
  metadata: Array<{
    key: string
    value: string
  }>
  ancillarySelection: {
    services: Array<{ id: string; quantity: number }>
    metadata: CheckoutAncillaryPayloadMetadata | null
  }
}

const E164_PHONE_PATTERN = /^\+[1-9]\d{6,14}$/
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function formatDateInputValue(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)

  if (digits.length <= 4) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

export function isValidDateOnly(value: string) {
  const trimmed = value.trim()

  if (!DATE_ONLY_PATTERN.test(trimmed)) {
    return false
  }

  const [year, month, day] = trimmed.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function isTodayOrPastDateOnly(value: string) {
  if (!isValidDateOnly(value)) {
    return false
  }

  const [year, month, day] = value.trim().split("-").map(Number)
  const date = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  return date <= today
}

function dateOnlySchema(input: {
  requiredMessage: string
  invalidMessage: string
  futureMessage?: string
}) {
  return z.string().trim().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({
        code: "custom",
        message: input.requiredMessage,
      })
      return
    }

    if (!isValidDateOnly(value)) {
      ctx.addIssue({
        code: "custom",
        message: input.invalidMessage,
      })
      return
    }

    if (input.futureMessage && !isTodayOrPastDateOnly(value)) {
      ctx.addIssue({
        code: "custom",
        message: input.futureMessage,
      })
    }
  })
}

export function createCheckoutFormSchema(input: {
  identityDocumentsRequired: boolean
}) {
  const identitySchema = z.object({
    identityType: z.enum(["passport", "tax_id", "known_traveler_number", "passenger_redress_number"]),
    identityNumber: input.identityDocumentsRequired
      ? z.string().trim().min(1, "Enter the document number").max(50)
      : z.string().trim().max(50),
    identityCountryCode: input.identityDocumentsRequired
      ? z
          .string()
          .trim()
          .regex(COUNTRY_CODE_PATTERN, "Use a 2-letter country code")
      : z
          .string()
          .trim()
          .refine(
            (value) => value.length === 0 || COUNTRY_CODE_PATTERN.test(value),
            "Use a 2-letter country code"
          ),
    identityExpiresOn: input.identityDocumentsRequired
      ? dateOnlySchema({
          requiredMessage: "Enter the document expiry date",
          invalidMessage: "Use a valid expiry date in YYYY-MM-DD format",
        })
      : z
          .string()
          .trim()
          .refine((value) => value.length === 0 || isValidDateOnly(value), {
            message: "Use a valid expiry date in YYYY-MM-DD format",
          }),
  })

  return z.object({
    paymentMode: z.enum(["pay_now", "hold"]),
    contact: z.object({
      email: z.email("Enter a valid email address"),
      phoneNumber: z
        .string()
        .trim()
        .regex(E164_PHONE_PATTERN, "Use international format, for example +94771234567"),
    }),
    passengers: z
      .array(
        z
          .object({
            id: z.string().min(1),
            type: z.enum(["adult", "child", "infant_without_seat"]),
            title: z.enum(["mr", "mrs", "ms", "miss", "dr"]),
            givenName: z
              .string()
              .trim()
              .min(1, "Enter the given name")
              .max(20, "Given name must be 20 characters or fewer"),
            familyName: z
              .string()
              .trim()
              .min(1, "Enter the family name")
              .max(20, "Family name must be 20 characters or fewer"),
            bornOn: dateOnlySchema({
              requiredMessage: "Enter the date of birth",
              invalidMessage: "Use a valid date of birth in YYYY-MM-DD format",
              futureMessage: "Date of birth cannot be in the future",
            }),
            gender: z.enum(["m", "f"]),
          })
          .and(identitySchema)
      )
      .min(1, "At least one passenger is required"),
    metadata: z
      .array(
        z.object({
          key: z.string().trim().max(40),
          value: z.string().trim().max(500),
        })
      ),
    ancillarySelection: z.object({
      services: z.array(
        z.object({
          id: z.string().min(1),
          quantity: z.number().int().min(1).max(9),
        })
      ),
      metadata: z.any().nullable(),
    }),
  })
}
