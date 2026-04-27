import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { CheckoutPageData } from "@/modules/flights/checkout/domain"
import { useCheckoutFlow } from "@/modules/flights/checkout/ui/hooks/use-checkout-flow"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"

const mocks = vi.hoisted(() => ({
  getCheckoutSessionStatusActionMock: vi.fn(),
  startCheckoutPaymentActionMock: vi.fn(),
  submitCheckoutActionMock: vi.fn(),
  ensurePayHereSdkMock: vi.fn(),
  startPayHerePaymentMock: vi.fn(),
}))

vi.mock("@/modules/flights/checkout/server/actions", () => ({
  getCheckoutSessionStatusAction: mocks.getCheckoutSessionStatusActionMock,
  startCheckoutPaymentAction: mocks.startCheckoutPaymentActionMock,
  submitCheckoutAction: mocks.submitCheckoutActionMock,
}))

vi.mock("@/modules/flights/checkout/ui/payhere-client", () => ({
  ensurePayHereSdk: mocks.ensurePayHereSdkMock,
  startPayHerePayment: mocks.startPayHerePaymentMock,
}))

describe("useCheckoutFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  test("keeps a single polling loop for the same checkout session", async () => {
    mocks.startCheckoutPaymentActionMock.mockResolvedValue({
      ok: true,
      data: {
        checkoutSessionId: "chs_1",
        payment: {
          sandbox: true,
          merchant_id: "merchant",
          return_url: "https://example.com/return",
          cancel_url: "https://example.com/cancel",
          notify_url: "https://example.com/notify",
          order_id: "chs_1",
          items: "Flight booking",
          amount: "123.00",
          currency: "LKR",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          phone: "+94710000000",
          address: "Colombo",
          city: "Colombo",
          country: "Sri Lanka",
          hash: "hash",
        },
        chargeAmount: 123,
        chargeCurrency: "LKR",
        chargeAmountLabel: "LKR123.00",
        status: "processing",
      },
    })
    mocks.ensurePayHereSdkMock.mockResolvedValue(undefined)
    mocks.getCheckoutSessionStatusActionMock.mockResolvedValue({
      ok: true,
      data: {
        checkoutSessionId: "chs_1",
        status: "completed",
        message: null,
        duffelOrderId: "ord_1",
        totalChargeAmountLabel: "LKR123.00",
      },
    })
    mocks.startPayHerePaymentMock.mockImplementation((input) => {
      input.onCompleted()
      input.onCompleted()
    })

    render(<CheckoutFlowHarness />)
    fireEvent.click(screen.getByRole("button", { name: "Submit pay now" }))

    await waitFor(() => {
      expect(mocks.getCheckoutSessionStatusActionMock).toHaveBeenCalledTimes(1)
    })
  })
})

function CheckoutFlowHarness() {
  const flow = useCheckoutFlow({
    data: createCheckoutData(),
  })

  return (
    <button
      type="button"
      onClick={() => {
        flow.onSubmit(createPayNowValues())
      }}
    >
      Submit pay now
    </button>
  )
}

function createPayNowValues(): CheckoutFormValues {
  return {
    paymentMode: "pay_now",
    contact: {
      email: "john@example.com",
      phoneNumber: "+94710000000",
    },
    billing: {
      address: "No 1",
      city: "Colombo",
      country: "Sri Lanka",
    },
    passengers: [
      {
        id: "pas_1",
        type: "adult",
        title: "mr",
        givenName: "John",
        familyName: "Doe",
        bornOn: "1990-01-01",
        gender: "m",
        identityType: "passport",
        identityNumber: "N1234567",
        identityCountryCode: "LK",
        identityExpiresOn: "2030-01-01",
      },
    ],
    metadata: [],
    ancillarySelection: {
      services: [],
      metadata: null,
    },
  }
}

function createCheckoutData(): CheckoutPageData {
  return {
    partialOfferRequestId: "prq_1",
    state: {
      offerId: "off_1",
      selectedPartialOffers: ["off_1_0"],
      quoteId: "pqt_1",
      step: "pay",
    },
    quote: {
      quoteId: "pqt_1",
      currency: "USD",
      fareNetAmount: 100,
      fareSellAmount: 110,
      fareSellAmountLabel: "US$110.00",
      expiresAtIso: "2026-04-25T10:00:00.000Z",
      expiresAtLabel: "25 Apr 2026, 15:30",
    },
    tripSummary: {
      journeyTypeLabel: "One way",
      dateRangeLabel: "25 Apr",
      passengersLabel: "1 passenger",
      cabinLabel: "Economy",
      routeLabel: "CMB - DXB",
      offerExpiresAtLabel: null,
    },
    selectedFlights: [],
    paymentRequirements: {
      requiresInstantPayment: true,
      canHold: false,
      paymentRequiredByIso: null,
      paymentRequiredByLabel: null,
      priceGuaranteeExpiresAtIso: null,
      priceGuaranteeExpiresAtLabel: null,
    },
    identityDocumentsRequired: false,
    supportedIdentityDocumentTypes: ["passport"],
    passengerDefaults: [{ id: "pas_1", type: "adult", label: "Adult 1" }],
    ancillary: {
      offer: {} as CheckoutPageData["ancillary"]["offer"],
      seatMaps: [],
    },
    payHere: {
      payNowEnabled: true,
      unavailableReason: null,
      chargeCurrency: "LKR",
      estimatedFareAmountLkr: 123,
      estimatedFareAmountLkrLabel: "LKR123.00",
      fxSourceCurrency: "USD",
      fxTargetCurrency: "LKR",
      fxBaseRate: 300,
      fxBufferPercent: 3,
      fxEffectiveRate: 309,
      scriptUrl: "https://www.payhere.lk/lib/payhere.js",
    },
  }
}
