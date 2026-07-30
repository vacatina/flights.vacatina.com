import { expect, test } from "vitest"

import {
  executeCapturePayPalOrderAction,
  executeCreatePayPalOrderAction,
  executeGetCheckoutSessionStatusAction,
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
        totalSellMoney: { amount: "10000", currency: "USD", scale: 2 },
        paymentRequiredByLabel: null,
      }
    },
  })

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.paymentMode).toBe("hold")
})

test("executeCreatePayPalOrderAction returns success for pay_now payload", async () => {
  const result = await executeCreatePayPalOrderAction(
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
      async createCheckoutPayPalOrder() {
        return {
          checkoutSessionId: "chs_1",
          paypalOrderId: "PAYPAL-ORDER-1",
          chargeAmount: 1000,
          chargeCurrency: "USD",
          chargeAmountLabel: "USD 1000.00",
          chargeMoney: { amount: "100000", currency: "USD", scale: 2 },
          status: "processing",
        }
      },
    }
  )

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.paypalOrderId).toBe("PAYPAL-ORDER-1")
})

test("executeCapturePayPalOrderAction returns success for valid input", async () => {
  const result = await executeCapturePayPalOrderAction(
    {
      checkoutSessionId: "chs_1",
      paypalOrderId: "PAYPAL-ORDER-1",
    },
    {
      async getActorContext() {
        return {
          type: "guest",
          guestId: "gst_1",
        }
      },
      async captureCheckoutPayPalOrder() {
        return {
          checkoutSessionId: "chs_1",
          status: "completed",
          message: null,
          duffelOrderId: "ord_1",
          bookingReference: "BK-TESTREF001",
          totalChargeAmountLabel: "USD 1000.00",
          totalChargeMoney: {
            amount: "100000",
            currency: "USD",
            scale: 2,
          },
        }
      },
    }
  )

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.status).toBe("completed")
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
          totalChargeAmountLabel: "USD 1000.00",
          totalChargeMoney: {
            amount: "100000",
            currency: "USD",
            scale: 2,
          },
        }
      },
    }
  )

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.status).toBe("processing")
})

test("executeCreatePayPalOrderAction sanitizes upstream errors", async () => {
  const result = await executeCreatePayPalOrderAction(
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
      async createCheckoutPayPalOrder() {
        throw new Error('Failed query: insert into "checkout_sessions" ...')
      },
    }
  )

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("UPSTREAM_ERROR")
  expect(!result.ok && result.error.message).toBe(
    "Could not create PayPal order right now. Please try again."
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
