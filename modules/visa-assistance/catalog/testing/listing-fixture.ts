import type { VisaListingRow } from "@/lib/db/schema"

export function listingFixture(
  overrides: Partial<VisaListingRow> = {}
): VisaListingRow {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    nationalityCode: "LK",
    destinationCode: "IN",
    code: "TOURIST",
    title: "India tourist visa",
    shortSummary: "For holiday visits.",
    fullDescription: "Assistance for your holiday.\nPrepare your documents.",
    eligibilityNotes: "Holiday travel only.",
    additionalNotes: "Dates are estimates.",
    processingTimeText: "5 business days",
    validityText: "30 days",
    maxStayText: "30 days",
    entriesText: "Single entry",
    passportValidityText: "6 months",
    feeCurrency: "USD",
    priceMinor: "3735",
    status: "published",
    documentsReviewed: true,
    reviewedAt: new Date("2026-09-30T00:00:00Z"),
    publishedAt: new Date("2026-09-30T00:00:00Z"),
    createdAt: new Date("2026-09-30T00:00:00Z"),
    updatedAt: new Date("2026-09-30T00:00:00Z"),
    createdBy: "private-actor",
    updatedBy: "private-actor",
    ...overrides,
  }
}
