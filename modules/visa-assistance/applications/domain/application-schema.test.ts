import { describe, expect, test } from "vitest"

import {
  contactStepSchema,
  documentMetadataSchema,
  reviewConsentSchema,
  travelersStepSchema,
  tripStepSchema,
} from "@/modules/visa-assistance/applications/domain"

describe("visa application schemas", () => {
  test("accepts a complete trip and traveler payload", () => {
    expect(
      tripStepSchema.safeParse({
        applicationId: "va_123",
        entryDate: "2099-10-10",
        travelerCount: 1,
      }).success
    ).toBe(true)

    expect(
      travelersStepSchema.safeParse({
        applicationId: "va_123",
        travelers: [
          {
            position: 0,
            title: "Ms",
            firstName: "Sam",
            lastName: "Perera",
            nationalityCode: "LK",
            dateOfBirth: "1990-01-01",
            passportNumber: "N1234567",
            passportExpiryDate: "2098-01-01",
          },
        ],
      }).success
    ).toBe(true)
  })

  test("rejects invalid contact details and unchecked consent", () => {
    expect(
      contactStepSchema.safeParse({
        applicationId: "va_123",
        contactEmail: "invalid",
        contactPhone: "0771234567",
      }).success
    ).toBe(false)

    expect(
      reviewConsentSchema.safeParse({
        applicationId: "va_123",
        expectedPricedAt: "2026-09-11T00:00:00.000Z",
        informationAccurate: true,
        termsAccepted: false,
        privacyAccepted: true,
      }).success
    ).toBe(false)
  })

  test("enforces document type, content type, and file size", () => {
    const baseDocument = {
      applicationId: "va_123",
      travelerId: "vat_123",
      requirementId: "550e8400-e29b-41d4-a716-446655440001",
      originalFilename: "passport.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    }

    expect(documentMetadataSchema.safeParse(baseDocument).success).toBe(true)
    expect(
      documentMetadataSchema.safeParse({
        ...baseDocument,
        mimeType: "application/zip",
      }).success
    ).toBe(false)
    expect(
      documentMetadataSchema.safeParse({
        ...baseDocument,
        sizeBytes: 10 * 1024 * 1024 + 1,
      }).success
    ).toBe(false)
  })
})
