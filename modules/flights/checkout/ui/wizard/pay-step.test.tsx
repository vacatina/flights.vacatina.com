import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import type { CheckoutPageData } from "@/modules/flights/checkout/domain"
import { CheckoutPayStep } from "@/modules/flights/checkout/ui/wizard/pay-step"

describe("CheckoutPayStep", () => {
  test("renders the live pay_now total including extras", () => {
    render(
      <CheckoutPayStep
        data={createCheckoutData()}
        paymentMode="pay_now"
        ancillaryPreviewTotal={35}
        totalPreview={135}
        submitError={null}
        paymentProcessingMessage={null}
        isSubmitting={false}
        clerkEnabled={false}
        signInHref="/sign-in"
        onBack={() => undefined}
      />
    )

    expect(screen.getByText("US$135.00")).toBeTruthy()
  })
})

function createCheckoutData(): CheckoutPageData {
  return {
    partialOfferRequestId: "prq_1",
    state: {
      offerId: "off_1",
      selectedPartialOffers: ["off_partial_1"],
      quoteId: "pqt_1",
      step: "pay",
    },
    quote: {
      quoteId: "pqt_1",
      currency: "USD",
      fareNetAmount: 90,
      fareSellAmount: 100,
      fareSellAmountLabel: "USD 100.00",
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
      provider: "stripe",
      checkoutUi: "hosted",
      payNowEnabled: true,
      unavailableReason: null,
      chargeAmount: 120,
      chargeCurrency: "USD",
      chargeAmountLabel: "USD 120.00",
    },
  }
}
