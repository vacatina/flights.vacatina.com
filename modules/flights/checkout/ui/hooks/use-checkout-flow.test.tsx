import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { CheckoutPageData } from "@/modules/flights/checkout/domain"
import { useCheckoutFlow } from "@/modules/flights/checkout/ui/hooks/use-checkout-flow"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"

const mocks = vi.hoisted(() => ({
  getCheckoutSessionStatusActionMock: vi.fn(),
  createPayPalOrderActionMock: vi.fn(),
  capturePayPalOrderActionMock: vi.fn(),
  submitCheckoutActionMock: vi.fn(),
}))

vi.mock("@/modules/flights/checkout/server/actions", () => ({
  capturePayPalOrderAction: mocks.capturePayPalOrderActionMock,
  createPayPalOrderAction: mocks.createPayPalOrderActionMock,
  getCheckoutSessionStatusAction: mocks.getCheckoutSessionStatusActionMock,
  submitCheckoutAction: mocks.submitCheckoutActionMock,
}))

describe("useCheckoutFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  test("pay_now creates and captures a PayPal order", async () => {
    mocks.createPayPalOrderActionMock.mockResolvedValue({
      ok: true,
      data: {
        checkoutSessionId: "chs_1",
        paypalOrderId: "PAYPAL-ORDER-1",
        chargeAmount: 123,
        chargeCurrency: "USD",
        chargeAmountLabel: "USD 123.00",
        status: "processing",
      },
    })
    mocks.capturePayPalOrderActionMock.mockResolvedValue({
      ok: true,
      data: {
        checkoutSessionId: "chs_1",
        status: "completed",
        message: null,
        duffelOrderId: "ord_1",
        bookingReference: "BK-TESTREF001",
        totalChargeAmountLabel: "USD 123.00",
      },
    })

    render(<CheckoutFlowHarness />)
    fireEvent.click(screen.getByRole("button", { name: "PayPal create/capture" }))

    await waitFor(() => {
      expect(mocks.createPayPalOrderActionMock).toHaveBeenCalled()
      expect(mocks.capturePayPalOrderActionMock).toHaveBeenCalledWith({
        checkoutSessionId: "chs_1",
        paypalOrderId: "PAYPAL-ORDER-1",
      })
    })
    await waitFor(() => {
      expect(screen.getByTestId("submit-success").textContent).toContain("ord_1")
    })
  })

  test("resumePayNowProcessing polls checkout status until completion", async () => {
    mocks.getCheckoutSessionStatusActionMock.mockResolvedValue({
      ok: true,
      data: {
        checkoutSessionId: "chs_1",
        status: "completed",
        message: null,
        duffelOrderId: "ord_1",
        bookingReference: "BK-TESTREF001",
        totalChargeAmountLabel: "USD 123.00",
      },
    })

    render(<CheckoutFlowHarness />)
    fireEvent.click(screen.getByRole("button", { name: "Resume pay now" }))

    await waitFor(() => {
      expect(mocks.getCheckoutSessionStatusActionMock).toHaveBeenCalledWith({
        checkoutSessionId: "chs_1",
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId("submit-success").textContent).toContain("ord_1")
    })
  })
})

function CheckoutFlowHarness() {
  const flow = useCheckoutFlow({
    data: createCheckoutData(),
  })

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void (async () => {
            const orderId = await flow.createPayPalOrder(createPayNowValues())
            await flow.capturePayPalOrder(orderId)
          })()
        }}
      >
        PayPal create/capture
      </button>
      <button
        type="button"
        onClick={() => {
          void flow.resumePayNowProcessing("chs_1")
        }}
      >
        Resume pay now
      </button>
      <output data-testid="submit-error">{flow.submitError}</output>
      <output data-testid="submit-success">
        {flow.submitSuccess ? `${flow.submitSuccess.duffelOrderId}:${flow.submitSuccess.bookingReference}` : ""}
      </output>
    </div>
  )
}

function createPayNowValues(): CheckoutFormValues {
  return {
    paymentMode: "pay_now",
    contact: {
      email: "john@example.com",
      phoneNumber: "+94710000000",
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
      fareSellAmount: 123,
      fareSellAmountLabel: "US$123.00",
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
    payment: {
      provider: "paypal",
      checkoutUi: "buttons",
      payNowEnabled: true,
      unavailableReason: null,
      chargeAmount: 123,
      chargeCurrency: "USD",
      chargeAmountLabel: "USD 123.00",
    },
  }
}
