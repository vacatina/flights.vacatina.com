import { describe, expect, test } from "vitest"

import {
  createCheckoutFormSchema,
  formatDateInputValue,
  isValidDateOnly,
} from "@/modules/flights/checkout/ui/checkout-form-values"

describe("createCheckoutFormSchema", () => {
  test("reports field-level errors for invalid traveler details", () => {
    const result = createCheckoutFormSchema({
      identityDocumentsRequired: true,
    }).safeParse({
      paymentMode: "pay_now",
      contact: {
        email: "traveler",
        phoneNumber: "0771234567",
      },
      passengers: [
        {
          id: "pas_1",
          type: "adult",
          title: "mr",
          givenName: "",
          familyName: "",
          bornOn: "",
          gender: "m",
          identityType: "passport",
          identityNumber: "",
          identityCountryCode: "usa",
          identityExpiresOn: "",
        },
      ],
      metadata: [],
      ancillarySelection: {
        services: [],
        metadata: null,
      },
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    const paths = result.error.issues.map((issue) => issue.path.join("."))

    expect(paths).toContain("contact.email")
    expect(paths).toContain("contact.phoneNumber")
    expect(paths).toContain("passengers.0.givenName")
    expect(paths).toContain("passengers.0.familyName")
    expect(paths).toContain("passengers.0.bornOn")
    expect(paths).toContain("passengers.0.identityNumber")
    expect(paths).toContain("passengers.0.identityCountryCode")
    expect(paths).toContain("passengers.0.identityExpiresOn")
  })

  test("allows optional identity document fields when documents are not required", () => {
    const result = createCheckoutFormSchema({
      identityDocumentsRequired: false,
    }).safeParse({
      paymentMode: "hold",
      contact: {
        email: "traveler@example.com",
        phoneNumber: "+94771234567",
      },
      passengers: [
        {
          id: "pas_1",
          type: "adult",
          title: "mr",
          givenName: "Alex",
          familyName: "Morgan",
          bornOn: "1990-01-01",
          gender: "m",
          identityType: "passport",
          identityNumber: "",
          identityCountryCode: "",
          identityExpiresOn: "",
        },
      ],
      metadata: [],
      ancillarySelection: {
        services: [],
        metadata: null,
      },
    })

    expect(result.success).toBe(true)
  })

  test("formats typed date digits and rejects impossible birth dates", () => {
    expect(formatDateInputValue("19900131")).toBe("1990-01-31")
    expect(formatDateInputValue("200333333333")).toBe("2003-33-33")
    expect(isValidDateOnly("1990-01-31")).toBe(true)
    expect(isValidDateOnly("2003-33-33")).toBe(false)

    const result = createCheckoutFormSchema({
      identityDocumentsRequired: false,
    }).safeParse({
      paymentMode: "hold",
      contact: {
        email: "traveler@example.com",
        phoneNumber: "+94771234567",
      },
      passengers: [
        {
          id: "pas_1",
          type: "adult",
          title: "mr",
          givenName: "Alex",
          familyName: "Morgan",
          bornOn: "2003-33-33",
          gender: "m",
          identityType: "passport",
          identityNumber: "",
          identityCountryCode: "",
          identityExpiresOn: "",
        },
      ],
      metadata: [],
      ancillarySelection: {
        services: [],
        metadata: null,
      },
    })

    expect(result.success).toBe(false)
    expect(result.success === false && result.error.issues[0]?.message).toBe(
      "Use a valid date of birth in YYYY-MM-DD format"
    )
  })
})
