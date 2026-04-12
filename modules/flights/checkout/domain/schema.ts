import { z } from "zod"

import type {
  CheckoutMetadataPairInput,
  CheckoutSubmitInput,
} from "@/modules/flights/checkout/domain/types"

const E164_PHONE_PATTERN = /^\+[1-9]\d{6,14}$/
const METADATA_KEY_PATTERN = /^[A-Za-z0-9_-]{1,40}$/

const contactSchema = z.object({
  email: z.email("Enter a valid email address"),
  phoneNumber: z
    .string()
    .trim()
    .regex(E164_PHONE_PATTERN, "Enter phone number in international format (+...)"),
})

const identityDocumentSchema = z.object({
  type: z.enum(["passport", "tax_id"]),
  uniqueIdentifier: z.string().trim().min(1).max(50),
  issuingCountryCode: z.string().trim().length(2),
  expiresOn: z.iso.date(),
})

const passengerSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(["adult", "child", "infant_without_seat"]),
  title: z.enum(["mr", "mrs", "ms", "miss", "dr"]),
  givenName: z.string().trim().min(1).max(20),
  familyName: z.string().trim().min(1).max(20),
  bornOn: z.iso.date(),
  gender: z.enum(["m", "f"]),
  email: z.email().optional(),
  phoneNumber: z.string().trim().optional(),
  identityDocument: identityDocumentSchema.nullish(),
})

const metadataPairSchema = z
  .object({
    key: z.string().trim().max(40),
    value: z.string().trim().max(500),
  })
  .superRefine((value, ctx) => {
    const hasKey = value.key.length > 0
    const hasValue = value.value.length > 0

    if (!hasKey && !hasValue) {
      return
    }

    if (!hasKey || !hasValue) {
      ctx.addIssue({
        code: "custom",
        message: "Provide both key and value for metadata",
      })
      return
    }

    if (!METADATA_KEY_PATTERN.test(value.key)) {
      ctx.addIssue({
        code: "custom",
        message: "Metadata key may contain letters, numbers, dashes, and underscores",
      })
    }
  })

const ancillarySelectionSchema = z.object({
  services: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(9),
      })
    )
    .default([]),
  metadata: z
    .object({
      offer_total_amount: z.string().optional(),
      offer_total_currency: z.string().optional(),
      baggage_services: z.array(z.object({ id: z.string(), quantity: z.number() })).optional(),
      seat_services: z.array(z.object({ id: z.string(), quantity: z.number() })).optional(),
      cancel_for_any_reason_services: z
        .array(z.object({ id: z.string(), quantity: z.number() }))
        .optional(),
    })
    .nullish(),
})

export const checkoutSubmitSchema = z
  .object({
    partialOfferRequestId: z.string().trim().min(1),
    offerId: z.string().trim().min(1),
    quoteId: z.string().trim().min(1),
    selectedPartialOffers: z.array(z.string().trim().min(1)).min(1),
    paymentMode: z.enum(["pay_now", "hold"]),
    contact: contactSchema,
    passengers: z.array(passengerSchema).min(1),
    metadata: z.array(metadataPairSchema).default([]),
    ancillarySelection: ancillarySelectionSchema.nullish(),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.selectedPartialOffers).size !== value.selectedPartialOffers.length) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedPartialOffers"],
        message: "Duplicate selected offers are not allowed",
      })
    }

    if (new Set(value.passengers.map((passenger) => passenger.id)).size !== value.passengers.length) {
      ctx.addIssue({
        code: "custom",
        path: ["passengers"],
        message: "Passenger IDs must be unique",
      })
    }

    const nonEmptyMetadata = value.metadata.filter(
      (item) => item.key.trim().length > 0 || item.value.trim().length > 0
    )

    if (nonEmptyMetadata.length > 50) {
      ctx.addIssue({
        code: "custom",
        path: ["metadata"],
        message: "Maximum 50 metadata entries are allowed",
      })
    }

    const uniqueKeys = new Set<string>()

    for (const item of nonEmptyMetadata) {
      const normalizedKey = item.key.trim().toLowerCase()

      if (uniqueKeys.has(normalizedKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["metadata"],
          message: "Metadata keys must be unique",
        })
        break
      }

      uniqueKeys.add(normalizedKey)
    }
  })

export type CheckoutSubmitSchemaValue = z.infer<typeof checkoutSubmitSchema>

export function normalizeMetadataPairs(
  metadata: CheckoutMetadataPairInput[]
): Record<string, string> {
  const normalized: Record<string, string> = {}

  for (const pair of metadata) {
    const key = pair.key.trim()
    const value = pair.value.trim()

    if (!key || !value) {
      continue
    }

    normalized[key] = value
  }

  return normalized
}

export function parseCheckoutSubmitInput(input: unknown): CheckoutSubmitInput {
  const parsed = checkoutSubmitSchema.parse(input)
  return parsed as CheckoutSubmitInput
}
