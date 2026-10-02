import type { VisaListingDocumentRow, VisaListingRow } from "@/lib/db/schema"
import { getListingEstimate } from "./money"

const publicFields = [
  "id",
  "nationalityCode",
  "destinationCode",
  "title",
  "shortSummary",
  "fullDescription",
  "eligibilityNotes",
  "processingTimeText",
  "validityText",
  "maxStayText",
  "entriesText",
  "passportValidityText",
  "additionalNotes",
  "feeCurrency",
  "governmentFeeMinor",
  "processingFeeMinor",
] as const

export type PublicVisaListing = Pick<
  VisaListingRow,
  (typeof publicFields)[number]
> & {
  reviewedAt: string | null
}

export type PublicVisaDocument = Pick<
  VisaListingDocumentRow,
  "id" | "label" | "instructions" | "required" | "scope"
>

export type PublicVisaDetail = PublicVisaListing & {
  documents: PublicVisaDocument[]
}

export function toPublicVisaListing(row: VisaListingRow): PublicVisaListing {
  // Explicit allowlist: never expose admin identity or audit fields publicly.
  const fields = Object.fromEntries(publicFields.map((key) => [key, row[key]]))
  return {
    ...fields,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  } as PublicVisaListing
}

export function publicListingPath(listing: PublicVisaListing) {
  return `/visa-assistance/${listing.nationalityCode}/${listing.destinationCode}/${listing.id}`
}

export function publicListingFees(listing: PublicVisaListing) {
  const { governmentFeeMinor, processingFeeMinor } = listing
  const total = getListingEstimate(listing)
  if (!total || governmentFeeMinor === null || processingFeeMinor === null) {
    throw new Error("Published visa listing is missing its fees")
  }
  return {
    total,
    government: { ...total, amount: governmentFeeMinor },
    processing: { ...total, amount: processingFeeMinor },
  }
}

export const listingFacts = [
  ["processingTimeText", "Processing time"],
  ["validityText", "Visa validity"],
  ["maxStayText", "Maximum stay"],
  ["entriesText", "Entries"],
  ["passportValidityText", "Passport validity"],
] as const
