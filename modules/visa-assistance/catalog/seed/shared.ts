import type { VisaListingInput } from "../domain/listing"

export const SEED_NOTICE =
  "Development sample only. Prices and document checklists are illustrative, " +
  "not verified visa requirements or a live offer. Vacatina must review and " +
  "replace these details before production use."

export const sharedDetails = {
  nationalityCode: "LK",
  code: "TOURIST",
  feeCurrency: "USD",
  documentsReviewed: true,
  eligibilityNotes:
    "For Sri Lankan passport holders planning tourism. Our team will confirm eligibility for your individual trip.",
  processingTimeText:
    "Our team will confirm the processing timeline after reviewing your request.",
  validityText: "To be confirmed for your selected visa.",
  maxStayText: "To be confirmed before you travel.",
  entriesText: "To be confirmed with your final quote.",
  passportValidityText:
    "Upload a current passport; our team will check the destination-specific validity requirement.",
  additionalNotes: SEED_NOTICE,
} satisfies Partial<VisaListingInput>

export const passport = {
  label: "Passport bio page",
  instructions:
    "Upload a clear scan showing the photo, personal details, and all page edges.",
  required: true,
  scope: "per_traveler" as const,
}
export const photo = {
  label: "Recent passport-style photo",
  instructions:
    "Upload a clear recent photo. Our team will confirm the required format.",
  required: true,
  scope: "per_traveler" as const,
}
export const itinerary = {
  label: "Travel itinerary",
  instructions:
    "If available, upload your planned entry and return dates for the group.",
  required: false,
  scope: "per_application" as const,
}
