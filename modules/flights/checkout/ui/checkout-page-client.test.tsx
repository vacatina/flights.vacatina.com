import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { CheckoutPageData } from "@/modules/flights/checkout/domain"
import { CheckoutPageClient } from "@/modules/flights/checkout/ui/checkout-page-client"

const mocks = vi.hoisted(() => ({
  capturePayPalOrderActionMock: vi.fn(),
  createPayPalOrderActionMock: vi.fn(),
  getCheckoutSessionStatusActionMock: vi.fn(),
  submitCheckoutActionMock: vi.fn(),
}))

const pushMock = vi.fn()
const replaceMock = vi.fn((href: string) => {
  const query = href.split("?")[1]
  searchParamsValue = query ?? ""
})
let searchParamsValue =
  "offer=off_1&selected=off_1_0&quote=pqt_1&step=pay&status=processing&session=chs_1"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => "/results/prq_1/checkout",
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}))

vi.mock("@/modules/flights/checkout/server/actions", () => ({
  capturePayPalOrderAction: mocks.capturePayPalOrderActionMock,
  createPayPalOrderAction: mocks.createPayPalOrderActionMock,
  getCheckoutSessionStatusAction: mocks.getCheckoutSessionStatusActionMock,
  submitCheckoutAction: mocks.submitCheckoutActionMock,
}))

describe("CheckoutPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParamsValue =
      "offer=off_1&selected=off_1_0&quote=pqt_1&step=pay&status=processing&session=chs_1"
  })

  afterEach(() => {
    cleanup()
  })

  test("shows the resolved success state immediately for a completed pay-now session", async () => {
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

    render(<CheckoutPageClient data={createCheckoutData()} clerkEnabled={false} />)

    await waitFor(() => {
      expect(mocks.getCheckoutSessionStatusActionMock).toHaveBeenCalledWith({
        checkoutSessionId: "chs_1",
      })
    })

    await waitFor(() => {
      expect(screen.getByText("Booking confirmed")).toBeTruthy()
    })

    expect(screen.queryByText("Processing payment...")).toBeNull()
    expect(pushMock).toHaveBeenCalledWith("/booking/BK-TESTREF001")
  })

  test("resumes polling after canonicalizing a stale terminal status back to processing", async () => {
    mocks.getCheckoutSessionStatusActionMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          checkoutSessionId: "chs_1",
          status: "processing",
          message: null,
          duffelOrderId: null,
          bookingReference: null,
          totalChargeAmountLabel: "USD 123.00",
        },
      })
      .mockResolvedValueOnce({
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

    render(
      <CheckoutPageClient
        data={createCheckoutData({
          state: {
            status: "success",
            sessionId: "chs_1",
          },
        })}
        clerkEnabled={false}
      />
    )

    await waitFor(() => {
      expect(mocks.getCheckoutSessionStatusActionMock).toHaveBeenCalledTimes(2)
    })

    expect(replaceMock).toHaveBeenCalledWith(
      expect.stringContaining("status=processing&session=chs_1")
    )
    expect(pushMock).toHaveBeenCalledWith("/booking/BK-TESTREF001")
  })
})

function createCheckoutData(
  overrides?: Omit<Partial<CheckoutPageData>, "state"> & {
    state?: Partial<CheckoutPageData["state"]>
  }
): CheckoutPageData {
  const base: CheckoutPageData = {
    partialOfferRequestId: "prq_1",
    state: {
      offerId: "off_1",
      selectedPartialOffers: ["off_1_0"],
      quoteId: "pqt_1",
      step: "pay",
      status: "processing",
      sessionId: "chs_1",
    },
    quote: {
      quoteId: "pqt_1",
      currency: "USD",
      fareNetAmount: 100,
      fareSellAmount: 123,
      fareSellAmountLabel: "USD 123.00",
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

  return {
    ...base,
    ...overrides,
    state: {
      ...base.state,
      ...overrides?.state,
    },
  }
}
