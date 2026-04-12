import { expect, test } from "vitest"

import { executeSubmitCheckoutAction } from "@/modules/flights/checkout/server/actions"

const validPayload = {
  partialOfferRequestId: "prq_1",
  offerId: "off_1",
  quoteId: "pqt_1",
  selectedPartialOffers: ["off_partial_1"],
  paymentMode: "pay_now" as const,
  contact: {
    email: "test@example.com",
    phoneNumber: "+94771234567",
  },
  passengers: [
    {
      id: "pas_1",
      type: "adult" as const,
      title: "mr" as const,
      givenName: "Tony",
      familyName: "Stark",
      bornOn: "1980-07-24",
      gender: "m" as const,
      identityDocument: null,
    },
  ],
  metadata: [],
  ancillarySelection: {
    services: [],
    metadata: null,
  },
}

test("executeSubmitCheckoutAction returns success for valid payload", async () => {
  const result = await executeSubmitCheckoutAction(validPayload, {
    async getActorContext() {
      return {
        type: "guest",
        guestId: "gst_1",
      }
    },
    async submitCheckout() {
      return {
        checkoutSessionId: "chs_1",
        flightOrderId: "fod_1",
        duffelOrderId: "ord_1",
        paymentMode: "pay_now",
        totalSellAmountLabel: "US$100.00",
        paymentRequiredByLabel: null,
      }
    },
  })

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.duffelOrderId).toBe("ord_1")
})

test("executeSubmitCheckoutAction returns validation error for invalid payload", async () => {
  const result = await executeSubmitCheckoutAction(
    {
      partialOfferRequestId: "prq_1",
    },
    {
      async getActorContext() {
        return {
          type: "guest",
          guestId: "gst_1",
        }
      },
    }
  )

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("VALIDATION_ERROR")
})
