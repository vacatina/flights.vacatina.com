import type { VisaApplicationDetail, VisaApplicationDocument } from "../domain"
import { createApplicationPricing, createListingSnapshot } from "../domain"
import { listingFixture } from "../../catalog/testing/listing-fixture"

export const requirementId = "550e8400-e29b-41d4-a716-446655440001"
export const sharedRequirementId = "550e8400-e29b-41d4-a716-446655440002"

export function applicationFixture(): VisaApplicationDetail {
  const listingSnapshot = createListingSnapshot({
    ...listingFixture(),
    documents: [
      {
        id: requirementId,
        listingId: listingFixture().id,
        label: "Passport",
        instructions: "Show all edges.",
        required: true,
        scope: "per_traveler",
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sharedRequirementId,
        listingId: listingFixture().id,
        label: "Itinerary",
        instructions: null,
        required: true,
        scope: "per_application",
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  })
  const now = new Date("2026-09-30T00:00:00Z")
  return {
    application: {
      id: "va_test",
      reference: "VISA-TEST",
      ownerUserId: "owner",
      listingId: listingSnapshot.id,
      listingSnapshot,
      nationalityCode: "LK",
      destinationCode: "IN",
      visaName: listingSnapshot.title,
      entryDate: "2099-01-01",
      travelerCount: 2,
      contactEmail: "test@example.com",
      contactPhone: "+94771234567",
      status: "draft",
      pricingSnapshot: createApplicationPricing(listingSnapshot, 2),
      internalNotes: null,
      submittedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    travelers: [0, 1].map((position) => ({
      id: `traveler-${position}`,
      applicationId: "va_test",
      position,
      title: "Ms",
      firstName: "Sam",
      lastName: `Perera ${position}`,
      nationalityCode: "LK",
      dateOfBirth: "1990-01-01",
      passportNumber: `N123456${position}`,
      passportExpiryDate: "2099-12-31",
      createdAt: now,
      updatedAt: now,
    })),
    documents: [],
  }
}

export function documentFixture(
  overrides: Partial<VisaApplicationDocument> = {}
): VisaApplicationDocument {
  return {
    id: "document-1",
    applicationId: "va_test",
    travelerId: "traveler-0",
    requirementId,
    status: "uploaded",
    objectKey: "test-only/key",
    originalFilename: "passport.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    etag: null,
    uploadedAt: new Date(),
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
