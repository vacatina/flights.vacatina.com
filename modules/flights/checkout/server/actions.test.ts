import { expect, test } from "vitest"

import {
  executeGetCheckoutSessionStatusAction,
  executeStartCheckoutPaymentAction,
  executeSubmitCheckoutAction,
} from "@/modules/flights/checkout/server/actions"

const validPayload = {
  partialOfferRequestId: "prq_1",
  offerId: "off_1",
  quoteId: "pqt_1",
  selectedPartialOffers: ["off_partial_1"],
  paymentMode: "hold" as const,
  contact: {
    email: "test@example.com",
    phoneNumber: "+94771234567",
  },
  billing: {
    address: "1 Main Street",
    city: "Colombo",
    country: "Sri Lanka",
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

test("executeSubmitCheckoutAction returns success for hold payload", async () => {
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
        bookingReference: "BK-TESTREF001",
        paymentMode: "hold",
        totalSellAmountLabel: "US$100.00",
        paymentRequiredByLabel: null,
      }
    },
  })

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.paymentMode).toBe("hold")
})

test("executeStartCheckoutPaymentAction returns success for pay_now payload", async () => {
  const result = await executeStartCheckoutPaymentAction(
    {
      ...validPayload,
      paymentMode: "pay_now",
    },
    {
      async getActorContext() {
        return {
          type: "guest",
          guestId: "gst_1",
        }
      },
      async startCheckoutPayment() {
        return {
          checkoutSessionId: "chs_1",
          payment: {
            sandbox: true,
            merchant_id: "merchant",
            return_url: "https://example.com",
            cancel_url: "https://example.com",
            notify_url: "https://example.com/notify",
            order_id: "chs_1",
            items: "Flight booking prq_1",
            amount: "1000.00",
            currency: "LKR",
            first_name: "Tony",
            last_name: "Stark",
            email: "test@example.com",
            phone: "+94771234567",
            address: "1 Main Street",
            city: "Colombo",
            country: "Sri Lanka",
            hash: "HASH",
          },
          chargeAmount: 1000,
          chargeCurrency: "LKR",
          chargeAmountLabel: "LKR 1000.00",
          status: "processing",
        }
      },
    }
  )

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.chargeCurrency).toBe("LKR")
})

test("executeGetCheckoutSessionStatusAction returns success for valid input", async () => {
  const result = await executeGetCheckoutSessionStatusAction(
    {
      checkoutSessionId: "chs_1",
    },
    {
      async getActorContext() {
        return {
          type: "guest",
          guestId: "gst_1",
        }
      },
      async getCheckoutSessionStatus() {
        return {
          checkoutSessionId: "chs_1",
          status: "processing",
          message: "processing",
          duffelOrderId: null,
          bookingReference: null,
          totalChargeAmountLabel: "LKR 1000.00",
        }
      },
    }
  )

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.status).toBe("processing")
})

test("executeStartCheckoutPaymentAction sanitizes upstream errors", async () => {
  const result = await executeStartCheckoutPaymentAction(
    {
      ...validPayload,
      paymentMode: "pay_now",
    },
    {
      async getActorContext() {
        return {
          type: "guest",
          guestId: "gst_1",
        }
      },
      async startCheckoutPayment() {
        throw new Error('Failed query: insert into "checkout_sessions" ...')
      },
    }
  )

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("UPSTREAM_ERROR")
  expect(!result.ok && result.error.message).toBe(
    "Could not start payment right now. Please try again."
  )
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
