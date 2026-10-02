import type { VisaListingRow, VisaListingDocumentRow } from "@/lib/db/schema"
import { isDisplayCurrencyCode } from "@/modules/currency/domain/registry"
import type { ParsedVisaListingInput } from "./listing"
import { listingFeeDecimal } from "./money"

export const EMPTY_LISTING_VALUES: ParsedVisaListingInput = {
  nationalityCode: "",
  destinationCode: "",
  code: "",
  title: "",
  shortSummary: "",
  fullDescription: "",
  eligibilityNotes: "",
  processingTimeText: "",
  validityText: "",
  maxStayText: "",
  entriesText: "",
  passportValidityText: "",
  additionalNotes: "",
  feeCurrency: "USD",
  governmentFee: "",
  processingFee: "",
  documentsReviewed: false,
  documents: [],
}

export function toListingFormValues(
  listing: VisaListingRow & { documents: VisaListingDocumentRow[] },
  duplicate = false
): ParsedVisaListingInput {
  return {
    ...EMPTY_LISTING_VALUES,
    nationalityCode: listing.nationalityCode,
    destinationCode: listing.destinationCode,
    code: duplicate ? "" : listing.code,
    title: listing.title,
    shortSummary: listing.shortSummary,
    fullDescription: listing.fullDescription,
    eligibilityNotes: listing.eligibilityNotes ?? "",
    processingTimeText: listing.processingTimeText ?? "",
    validityText: listing.validityText ?? "",
    maxStayText: listing.maxStayText ?? "",
    entriesText: listing.entriesText ?? "",
    passportValidityText: listing.passportValidityText ?? "",
    additionalNotes: listing.additionalNotes ?? "",
    feeCurrency: isDisplayCurrencyCode(listing.feeCurrency)
      ? listing.feeCurrency
      : null,
    governmentFee: listingFeeDecimal(
      listing.governmentFeeMinor,
      listing.feeCurrency
    ),
    processingFee: listingFeeDecimal(
      listing.processingFeeMinor,
      listing.feeCurrency
    ),
    documentsReviewed: duplicate ? false : listing.documentsReviewed,
    documents: listing.documents.map((document) => ({
      id: duplicate ? undefined : document.id,
      label: document.label,
      instructions: document.instructions ?? "",
      scope: document.scope,
      required: document.required,
    })),
  }
}
