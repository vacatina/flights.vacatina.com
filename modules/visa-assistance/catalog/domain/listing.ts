import { z } from "zod"

import { isDisplayCurrencyCode } from "@/modules/currency/domain/registry"
import { getVisaCountry } from "@/modules/visa-assistance/domain/countries"
import { parseListingFee } from "./money"

export { listingFeeDecimal } from "./money"

const countrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Select a country")
  .refine((code) => getVisaCountry(code) !== null, "Select a known country")

const optionalText = z.string().trim().max(5000).nullish()

export const visaListingDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Enter a document name").max(120),
  instructions: z.string().trim().max(1000).nullish(),
  required: z.boolean(),
  scope: z.enum(["per_traveler", "per_application"]),
})

export const visaListingInputSchema = z
  .object({
    nationalityCode: countrySchema,
    destinationCode: countrySchema,
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{2,40}$/, "Use 2–40 letters, numbers, _ or -"),
    title: z.string().trim().max(160).default(""),
    shortSummary: z.string().trim().max(500).default(""),
    fullDescription: z.string().trim().max(10000).default(""),
    eligibilityNotes: optionalText,
    processingTimeText: optionalText,
    validityText: optionalText,
    maxStayText: optionalText,
    entriesText: optionalText,
    passportValidityText: optionalText,
    additionalNotes: optionalText,
    feeCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .refine(isDisplayCurrencyCode, "Select a supported currency")
      .nullish(),
    price: z.string().trim().nullish(),
    documentsReviewed: z.boolean().default(false),
    documents: z.array(visaListingDocumentSchema).max(30),
  })
  .refine((value) => value.nationalityCode !== value.destinationCode, {
    path: ["destinationCode"],
    message: "Choose a different destination",
  })
  .superRefine((value, context) => {
    try {
      parseListingFee(value.price, value.feeCurrency ?? null)
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["price"],
        message: error instanceof Error ? error.message : "Enter a valid price",
      })
    }
    const ids = value.documents.flatMap((document) =>
      document.id ? [document.id] : []
    )
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["documents"],
        message: "Document IDs must be unique",
      })
    }
  })

export type VisaListingInput = z.input<typeof visaListingInputSchema>
export type ParsedVisaListingInput = z.output<typeof visaListingInputSchema>

export function parseVisaListingFees(input: ParsedVisaListingInput) {
  const currency = input.feeCurrency || null

  return {
    feeCurrency: currency,
    priceMinor: parseListingFee(input.price, currency),
  }
}

export function getListingPublishIssues(input: {
  title: string
  shortSummary: string
  fullDescription: string
  feeCurrency: string | null
  priceMinor: string | null
  documentsReviewed: boolean
}) {
  const issues: string[] = []
  if (!input.title.trim()) issues.push("Add a public title")
  if (!input.shortSummary.trim()) issues.push("Add a short summary")
  if (!input.fullDescription.trim()) issues.push("Add a full description")
  if (!input.feeCurrency) issues.push("Select a price currency")
  if (input.priceMinor === null) issues.push("Enter the price")
  if (!input.documentsReviewed) issues.push("Review the document checklist")
  return issues
}
