import { z } from "zod"

import { VISA_APPLICATION_MAX_TRAVELERS } from "@/modules/visa-assistance/applications/domain/constants"

const isoCountryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Choose a valid country")

const isoDateSchema = z.string().date("Enter a valid date")

export const createVisaApplicationSchema = z.object({
  nationalityCode: isoCountryCodeSchema,
  destinationCode: isoCountryCodeSchema,
  visaTypeId: z.string().trim().min(1),
  providerProductId: z.string().trim().min(1).nullable(),
})

export const tripStepSchema = z.object({
  applicationId: z.string().trim().min(1),
  entryDate: isoDateSchema.refine(
    (value) => new Date(`${value}T00:00:00Z`) >= startOfTodayUtc(),
    "Entry date cannot be in the past"
  ),
  travelerCount: z.number().int().min(1).max(VISA_APPLICATION_MAX_TRAVELERS),
})

export const travelerSchema = z
  .object({
    position: z
      .number()
      .int()
      .min(0)
      .max(VISA_APPLICATION_MAX_TRAVELERS - 1),
    title: z.enum(["Mr", "Mrs", "Ms", "Miss", "Mx"]),
    firstName: z.string().trim().min(1, "Enter the first name").max(100),
    lastName: z.string().trim().min(1, "Enter the last name").max(100),
    nationalityCode: isoCountryCodeSchema,
    dateOfBirth: isoDateSchema,
    passportNumber: z
      .string()
      .trim()
      .min(4, "Enter a valid passport number")
      .max(30)
      .regex(/^[A-Za-z0-9 -]+$/, "Enter a valid passport number"),
    passportExpiryDate: isoDateSchema,
  })
  .superRefine((traveler, context) => {
    if (traveler.passportExpiryDate <= traveler.dateOfBirth) {
      context.addIssue({
        code: "custom",
        path: ["passportExpiryDate"],
        message: "Passport expiry must be after the date of birth",
      })
    }
  })

export const travelersStepSchema = z.object({
  applicationId: z.string().trim().min(1),
  travelers: z.array(travelerSchema).min(1).max(VISA_APPLICATION_MAX_TRAVELERS),
})

export const contactStepSchema = z.object({
  applicationId: z.string().trim().min(1),
  contactEmail: z.email("Enter a valid email address").trim().max(320),
  contactPhone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(30)
    .regex(/^\+[1-9][0-9 ()-]{6,29}$/, "Include the country code"),
})

export const reviewConsentSchema = z.object({
  applicationId: z.string().trim().min(1),
  expectedPricedAt: z.string().datetime(),
  informationAccurate: z.boolean().refine(Boolean, {
    message: "Confirm that the information is accurate",
  }),
  termsAccepted: z.boolean().refine(Boolean, {
    message: "Accept the terms and conditions",
  }),
  privacyAccepted: z.boolean().refine(Boolean, {
    message: "Accept the privacy and document-processing terms",
  }),
})

function startOfTodayUtc() {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
}
