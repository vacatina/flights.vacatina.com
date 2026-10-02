import { z } from "zod"
import { isDisplayCurrencyCode } from "@/modules/currency/domain/registry"
import { visaListingDocumentSchema } from "@/modules/visa-assistance/catalog/domain/listing"
import { toPublicVisaListing } from "@/modules/visa-assistance/catalog/domain/public-listing"
import type { VisaListing } from "@/modules/visa-assistance/catalog/server/repository"
import { getVisaCountry } from "@/modules/visa-assistance/domain/countries"

const text = z.string().max(5000).nullable()
const country = z
  .string()
  .refine((value) => Boolean(getVisaCountry(value)), "Choose a known country")
const amount = z.string().regex(/^\d{1,30}$/)

export const visaListingSnapshotSchema = z
  .object({
    id: z.uuid(),
    nationalityCode: country,
    destinationCode: country,
    title: z.string().min(1).max(160),
    shortSummary: z.string().min(1).max(500),
    fullDescription: z.string().min(1).max(10000),
    eligibilityNotes: text,
    processingTimeText: text,
    validityText: text,
    maxStayText: text,
    entriesText: text,
    passportValidityText: text,
    additionalNotes: text,
    feeCurrency: z.string().refine(isDisplayCurrencyCode),
    priceMinor: amount,
    reviewedAt: z.iso.datetime().nullable(),
    capturedAt: z.iso.datetime(),
    documents: z
      .array(visaListingDocumentSchema.extend({ id: z.uuid() }))
      .max(30),
  })
  .refine(
    (value) =>
      new Set(value.documents.map((item) => item.id)).size ===
      value.documents.length,
    "Document IDs must be unique"
  )

export type VisaListingSnapshot = z.infer<typeof visaListingSnapshotSchema>
export type VisaDocumentRequirement = VisaListingSnapshot["documents"][number]

export function createListingSnapshot(
  listing: VisaListing
): VisaListingSnapshot {
  return visaListingSnapshotSchema.parse({
    ...toPublicVisaListing(listing),
    capturedAt: new Date().toISOString(),
    documents: listing.documents.map(
      ({ id, label, instructions, required, scope }) => ({
        id,
        label,
        instructions,
        required,
        scope,
      })
    ),
  })
}
