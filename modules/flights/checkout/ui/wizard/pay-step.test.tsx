import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type React from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { CheckoutPageData } from "@/modules/flights/checkout/domain"
import { CheckoutPayStep } from "@/modules/flights/checkout/ui/wizard/pay-step"

const paypalSdkMock = vi.hoisted(() => ({
  loadingStatus: "resolved",
  sdkError: null as Error | null,
  eligibilityLoading: false,
  eligibilityError: null as Error | null,
  paypalEligible: true,
  providerProps: [] as Record<string, unknown>[],
  createdOrders: [] as { orderId: string }[],
}))

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  INSTANCE_LOADING_STATE: {
    PENDING: "pending",
    RESOLVED: "resolved",
    REJECTED: "rejected",
  },
  PayPalProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode
  } & Record<string, unknown>) => {
    paypalSdkMock.providerProps.push(props)
    return (
      <div
        data-testid="paypal-v6-provider"
        data-client-id={String(props.clientId)}
        data-components={JSON.stringify(props.components)}
        data-debug={String(props.debug)}
        data-environment={String(props.environment)}
        data-page-type={String(props.pageType)}
      >
        {children}
      </div>
    )
  },
  PayPalOneTimePaymentButton: ({
    createOrder,
    disabled,
    onApprove,
    onCancel,
    onError,
  }: {
    createOrder: () => Promise<{ orderId: string }>
    disabled?: boolean
    onApprove: (data: { orderId: string }) => Promise<void>
    onCancel?: () => void
    onError?: (error: Error & { code: string; isRecoverable: boolean }) => void
  }) => (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          try {
            const order = await createOrder()
            paypalSdkMock.createdOrders.push(order)
            await onApprove(order)
          } catch (error) {
            onError?.(
              Object.assign(error instanceof Error ? error : new Error(String(error)), {
                code: "TEST_ERROR",
                isRecoverable: true,
              })
            )
          }
        }}
      >
        PayPal v6
      </button>
      <button type="button" onClick={onCancel}>
        Cancel PayPal
      </button>
    </div>
  ),
  useEligibleMethods: () => ({
    eligiblePaymentMethods: paypalSdkMock.paypalEligible
      ? { isEligible: () => true }
      : { isEligible: () => false },
    isLoading: paypalSdkMock.eligibilityLoading,
    error: paypalSdkMock.eligibilityError,
  }),
  usePayPal: () => ({
    loadingStatus: paypalSdkMock.loadingStatus,
    error: paypalSdkMock.sdkError,
  }),
}))

describe("CheckoutPayStep", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-public-client-id")
    paypalSdkMock.loadingStatus = "resolved"
    paypalSdkMock.sdkError = null
    paypalSdkMock.eligibilityLoading = false
    paypalSdkMock.eligibilityError = null
    paypalSdkMock.paypalEligible = true
    paypalSdkMock.providerProps = []
    paypalSdkMock.createdOrders = []
  })

  afterEach(() => {
    cleanup()
  })

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
        paymentReady
        quoteExpired={false}
        reviewHref="/results/prq_1/review"
        clerkEnabled={false}
        signInHref="/sign-in"
        onBack={() => undefined}
        onPayPalCancel={() => undefined}
        onPayPalError={() => undefined}
        onCreatePayPalOrder={async () => "PAYPAL-ORDER-1"}
        onCapturePayPalOrder={async () => undefined}
      />
    )

    expect(screen.getByText("US$135.00")).toBeTruthy()
  })

  test("configures PayPal React SDK v6 from checkout payment data", () => {
    render(
      <CheckoutPayStep
        data={createCheckoutData({
          payment: {
            ...createCheckoutData().payment,
            paypalEnvironment: "production",
          },
        })}
        paymentMode="pay_now"
        ancillaryPreviewTotal={0}
        totalPreview={120}
        submitError={null}
        paymentProcessingMessage={null}
        isSubmitting={false}
        paymentReady
        quoteExpired={false}
        reviewHref="/results/prq_1/review"
        clerkEnabled={false}
        signInHref="/sign-in"
        onBack={() => undefined}
        onPayPalCancel={() => undefined}
        onPayPalError={() => undefined}
        onCreatePayPalOrder={async () => "PAYPAL-ORDER-1"}
        onCapturePayPalOrder={async () => undefined}
      />
    )

    const provider = screen.getByTestId("paypal-v6-provider")
    expect(provider.getAttribute("data-client-id")).toBe("test-public-client-id")
    expect(provider.getAttribute("data-environment")).toBe("production")
    expect(provider.getAttribute("data-components")).toBe(JSON.stringify(["paypal-payments"]))
    expect(provider.getAttribute("data-page-type")).toBe("checkout")
    expect(provider.getAttribute("data-debug")).toBe("false")
  })

  test("creates a v6 order object and captures after approval", async () => {
    const onCreatePayPalOrder = vi.fn(async () => "PAYPAL-ORDER-1")
    const onCapturePayPalOrder = vi.fn(async () => undefined)

    render(
      <CheckoutPayStep
        data={createCheckoutData()}
        paymentMode="pay_now"
        ancillaryPreviewTotal={0}
        totalPreview={120}
        submitError={null}
        paymentProcessingMessage={null}
        isSubmitting={false}
        paymentReady
        quoteExpired={false}
        reviewHref="/results/prq_1/review"
        clerkEnabled={false}
        signInHref="/sign-in"
        onBack={() => undefined}
        onPayPalCancel={() => undefined}
        onPayPalError={() => undefined}
        onCreatePayPalOrder={onCreatePayPalOrder}
        onCapturePayPalOrder={onCapturePayPalOrder}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "PayPal v6" }))

    await waitFor(() => {
      expect(paypalSdkMock.createdOrders).toEqual([{ orderId: "PAYPAL-ORDER-1" }])
      expect(onCapturePayPalOrder).toHaveBeenCalledWith("PAYPAL-ORDER-1")
    })
  })

  test("shows unavailable state when PayPal wallet is ineligible", () => {
    paypalSdkMock.paypalEligible = false

    render(
      <CheckoutPayStep
        data={createCheckoutData()}
        paymentMode="pay_now"
        ancillaryPreviewTotal={0}
        totalPreview={120}
        submitError={null}
        paymentProcessingMessage={null}
        isSubmitting={false}
        paymentReady
        quoteExpired={false}
        reviewHref="/results/prq_1/review"
        clerkEnabled={false}
        signInHref="/sign-in"
        onBack={() => undefined}
        onPayPalCancel={() => undefined}
        onPayPalError={() => undefined}
        onCreatePayPalOrder={async () => "PAYPAL-ORDER-1"}
        onCapturePayPalOrder={async () => undefined}
      />
    )

    expect(screen.getByText("PayPal is unavailable for this booking.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "PayPal v6" })).toBeNull()
  })

  test("shows loading state while PayPal initializes", () => {
    paypalSdkMock.loadingStatus = "pending"

    render(
      <CheckoutPayStep
        data={createCheckoutData()}
        paymentMode="pay_now"
        ancillaryPreviewTotal={0}
        totalPreview={120}
        submitError={null}
        paymentProcessingMessage={null}
        isSubmitting={false}
        paymentReady
        quoteExpired={false}
        reviewHref="/results/prq_1/review"
        clerkEnabled={false}
        signInHref="/sign-in"
        onBack={() => undefined}
        onPayPalCancel={() => undefined}
        onPayPalError={() => undefined}
        onCreatePayPalOrder={async () => "PAYPAL-ORDER-1"}
        onCapturePayPalOrder={async () => undefined}
      />
    )

    expect(screen.getByText("Loading PayPal")).toBeTruthy()
  })

  test("reports cancellation from v6 controls", async () => {
    const onPayPalCancel = vi.fn()

    render(
      <CheckoutPayStep
        data={createCheckoutData()}
        paymentMode="pay_now"
        ancillaryPreviewTotal={0}
        totalPreview={120}
        submitError={null}
        paymentProcessingMessage={null}
        isSubmitting={false}
        paymentReady
        quoteExpired={false}
        reviewHref="/results/prq_1/review"
        clerkEnabled={false}
        signInHref="/sign-in"
        onBack={() => undefined}
        onPayPalCancel={onPayPalCancel}
        onPayPalError={() => undefined}
        onCreatePayPalOrder={async () => "PAYPAL-ORDER-1"}
        onCapturePayPalOrder={async () => undefined}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Cancel PayPal" }))

    expect(onPayPalCancel).toHaveBeenCalled()
  })

  test("shows refresh guidance when the quote is expired", () => {
    render(
      <CheckoutPayStep
        data={createCheckoutData()}
        paymentMode="pay_now"
        ancillaryPreviewTotal={0}
        totalPreview={123}
        submitError={null}
        paymentProcessingMessage={null}
        isSubmitting={false}
        paymentReady={false}
        quoteExpired
        reviewHref="/results/prq_1/review"
        clerkEnabled={false}
        signInHref="/sign-in"
        onBack={() => undefined}
        onPayPalCancel={() => undefined}
        onPayPalError={() => undefined}
        onCreatePayPalOrder={async () => "PAYPAL-ORDER-1"}
        onCapturePayPalOrder={async () => undefined}
      />
    )

    expect(screen.getByText("This fare has expired.")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Refresh pricing" }).getAttribute("href")).toBe(
      "/results/prq_1/review"
    )
  })
})

function createCheckoutData(overrides?: Partial<CheckoutPageData>): CheckoutPageData {
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
      provider: "paypal",
      checkoutUi: "buttons",
      paypalEnvironment: "sandbox",
      payNowEnabled: true,
      unavailableReason: null,
      chargeAmount: 120,
      chargeCurrency: "USD",
      chargeAmountLabel: "USD 120.00",
    },
    ...overrides,
  }
}
