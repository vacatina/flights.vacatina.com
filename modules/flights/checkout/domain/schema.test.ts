import { expect, test } from "vitest"

import { checkoutSubmitSchema } from "@/modules/flights/checkout/domain/schema"

const validPayload = {
  partialOfferRequestId: "prq_1",
  offerId: "off_1",
  quoteId: "pqt_1",
  selectedPartialOffers: ["off_partial_1"],
  paymentMode: "pay_now",
  contact: {
    email: "test@example.com",
    phoneNumber: "+94771234567",
  },
  passengers: [
    {
      id: "pas_1",
      type: "adult",
      title: "mr",
      givenName: "Tony",
      familyName: "Stark",
      bornOn: "1980-07-24",
      gender: "m",
    },
  ],
  metadata: [],
}

test("checkoutSubmitSchema accepts valid payload", () => {
  const parsed = checkoutSubmitSchema.safeParse(validPayload)
  expect(parsed.success).toBe(true)
})

test("checkoutSubmitSchema rejects duplicate selected offers", () => {
  const parsed = checkoutSubmitSchema.safeParse({
    ...validPayload,
    selectedPartialOffers: ["off_partial_1", "off_partial_1"],
  })

  expect(parsed.success).toBe(false)
  expect(parsed.success === false && parsed.error.issues[0]?.message).toMatch(
    /Duplicate selected offers/
  )
})

test("checkoutSubmitSchema rejects invalid metadata key", () => {
  const parsed = checkoutSubmitSchema.safeParse({
    ...validPayload,
    metadata: [
      {
        key: "invalid key",
        value: "value",
      },
    ],
  })

  expect(parsed.success).toBe(false)
  expect(parsed.success === false && parsed.error.issues[0]?.message).toMatch(
    /Metadata key/
  )
})
