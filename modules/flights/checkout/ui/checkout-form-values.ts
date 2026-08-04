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
      ? z.iso.date("Enter the document expiry date")
      : z
          .string()
          .trim()
          .refine((value) => value.length === 0 || z.iso.date().safeParse(value).success, {
            message: "Enter a valid expiry date",
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
            bornOn: z.iso.date("Enter the date of birth"),
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
