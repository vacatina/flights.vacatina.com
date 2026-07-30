"use client"

import Link from "next/link"
import {
  INSTANCE_LOADING_STATE,
  PayPalGuestPaymentButton,
  PayPalOneTimePaymentButton,
  PayPalProvider,
  useEligibleMethods,
  usePayPal,
} from "@paypal/react-paypal-js/sdk-v6"
import { Show } from "@clerk/nextjs"
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import type { CheckoutPageData } from "@/modules/flights/checkout/domain"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"
import {
  DecimalMoney,
  FxEstimateDisclosure,
  Money,
  OriginalMoney,
} from "@/modules/currency/ui"

interface CheckoutPayStepProps {
  data: CheckoutPageData
  paymentMode: CheckoutFormValues["paymentMode"] | undefined
  ancillaryPreviewTotal: number
  totalPreview: number
  submitError: string | null
  paymentProcessingMessage: string | null
  isSubmitting: boolean
  paymentReady: boolean
  quoteExpired: boolean
  reviewHref: string
  clerkEnabled: boolean
  signInHref: string
  onBack: () => void
  onPayPalCancel: () => void
  onPayPalError: (error: unknown) => void
  onCreatePayPalOrder: () => Promise<string>
  onCapturePayPalOrder: (paypalOrderId: string) => Promise<void>
  isBackNavigating?: boolean
}

export function CheckoutPayStep({
  data,
  paymentMode,
  ancillaryPreviewTotal,
  totalPreview,
  submitError,
  paymentProcessingMessage,
  isSubmitting,
  paymentReady,
  quoteExpired,
  reviewHref,
  clerkEnabled,
  signInHref,
  onBack,
  onPayPalCancel,
  onPayPalError,
  onCreatePayPalOrder,
  onCapturePayPalOrder,
  isBackNavigating = false,
}: CheckoutPayStepProps) {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim()

  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight md:text-xl">
          {paymentMode === "hold" ? "Confirm and pay later" : "Review and pay"}
        </h2>
        <Card className="rounded-lg border-[#d7d8ce]">
          <CardContent className="space-y-3 p-4 md:p-5">
            <div className="flex items-center justify-between text-sm">
              <span>Fare</span>
              <Money
                money={data.quote.fareSellMoney}
                fallbackLabel={data.quote.fareSellAmountLabel}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Extras</span>
              <DecimalMoney
                value={ancillaryPreviewTotal}
                currency={data.quote.currency}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between text-lg font-semibold md:text-base">
              <span>Total</span>
              <DecimalMoney
                value={totalPreview}
                currency={
                  paymentMode === "pay_now"
                    ? data.payment.chargeCurrency
                    : data.quote.currency
                }
              />
            </div>
            {paymentMode === "pay_now" && data.payment.chargeMoney ? (
              <p className="text-sm text-muted-foreground">
                You&apos;ll be charged{" "}
                <OriginalMoney
                  money={data.payment.chargeMoney}
                  className="font-medium text-foreground"
                />
                .
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {paymentMode === "pay_now"
                ? "Confirm the trip total before opening PayPal. Payment is captured only after approval."
                : "Final amount is revalidated on confirm before order creation."}
            </p>
            <FxEstimateDisclosure
              sourceCurrencies={[
                data.quote.currency,
                data.payment.chargeCurrency,
              ]}
            />
          </CardContent>
        </Card>

        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
        {paymentProcessingMessage ? (
          <p className="text-sm text-muted-foreground">{paymentProcessingMessage}</p>
        ) : null}

        {clerkEnabled ? (
          <Show when="signed-out">
            <p className="text-sm text-muted-foreground">
              Sign in for faster checkout and future order history.{" "}
              <Link href={signInHref} className="text-primary underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </Show>
        ) : null}
      </section>

      {paymentMode === "pay_now" && data.payment.payNowEnabled ? (
        quoteExpired ? (
          <div className="space-y-3 rounded-lg border border-destructive/30 bg-white p-4">
            <div className="space-y-3 rounded-md bg-destructive/5 px-3 py-3 text-sm">
              <p className="font-medium text-destructive">This fare has expired.</p>
              <p className="text-muted-foreground">
                Refresh pricing before starting PayPal so the airline total is current.
              </p>
              <Button size="sm" variant="outline" render={<Link href={reviewHref} />}>
                Refresh pricing
              </Button>
            </div>
          </div>
        ) : paypalClientId ? (
          <div className="space-y-3 rounded-lg border border-[#d7d8ce] bg-white p-4">
            <div className="flex items-start gap-2 text-sm text-[#66706b]">
              <ShieldCheckIcon className="mt-0.5 size-4 text-emerald-700" />
              <div>
                <p className="font-medium text-[#17201d]">Payment secured by PayPal</p>
                <p>
                  Traveler details must be complete before payment can start.
                </p>
              </div>
            </div>
            {!paymentReady ? (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Complete the highlighted traveler details before continuing to PayPal.
              </p>
            ) : null}
            <PayPalV6Checkout
              clientId={paypalClientId}
              data={data}
              disabled={quoteExpired || !paymentReady || isSubmitting}
              onCreatePayPalOrder={onCreatePayPalOrder}
              onCapturePayPalOrder={onCapturePayPalOrder}
              onPayPalCancel={onPayPalCancel}
              onPayPalError={onPayPalError}
            />
          </div>
        ) : (
          <p className="text-sm text-destructive">
            PayPal checkout is not configured. Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID.
          </p>
        )
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl px-6"
          onClick={onBack}
          disabled={isSubmitting || isBackNavigating}
        >
          {isBackNavigating ? (
            <Spinner data-icon="inline-start" size="sm" />
          ) : null}
          Back
        </Button>
        {paymentMode === "hold" ? (
          <Button type="submit" className="h-12 rounded-xl px-6 text-sm md:text-base" disabled={isSubmitting}>
            {isSubmitting ? (
              <Spinner data-icon="inline-start" size="sm" />
            ) : null}
            {isSubmitting ? "Confirming..." : "Confirm and hold"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

interface PayPalV6CheckoutProps {
  clientId: string
  data: CheckoutPageData
  disabled: boolean
  onCreatePayPalOrder: () => Promise<string>
  onCapturePayPalOrder: (paypalOrderId: string) => Promise<void>
  onPayPalCancel: () => void
  onPayPalError: (error: unknown) => void
}

function PayPalV6Checkout({
  clientId,
  data,
  disabled,
  onCreatePayPalOrder,
  onCapturePayPalOrder,
  onPayPalCancel,
  onPayPalError,
}: PayPalV6CheckoutProps) {
  return (
    <PayPalProvider
      clientId={clientId}
      environment={data.payment.paypalEnvironment}
      components={["paypal-payments", "paypal-guest-payments"]}
      pageType="checkout"
      debug={data.payment.paypalEnvironment === "sandbox"}
    >
      <PayPalV6PaymentControls
        data={data}
        disabled={disabled}
        onCreatePayPalOrder={onCreatePayPalOrder}
        onCapturePayPalOrder={onCapturePayPalOrder}
        onPayPalCancel={onPayPalCancel}
        onPayPalError={onPayPalError}
      />
    </PayPalProvider>
  )
}

function PayPalV6PaymentControls({
  data,
  disabled,
  onCreatePayPalOrder,
  onCapturePayPalOrder,
  onPayPalCancel,
  onPayPalError,
}: Omit<PayPalV6CheckoutProps, "clientId">) {
  const paypal = usePayPal()
  const amount = data.payment.chargeAmount
  const eligibility = useEligibleMethods({
    payload: {
      currencyCode: data.payment.chargeCurrency,
      amount: amount === null ? undefined : formatPayPalEligibilityAmount(amount),
    },
  })

  const sdkRejected = paypal.loadingStatus === INSTANCE_LOADING_STATE.REJECTED
  const sdkError = paypal.error ?? eligibility.error
  const loading = paypal.loadingStatus === INSTANCE_LOADING_STATE.PENDING || eligibility.isLoading
  const paypalEligible = eligibility.eligiblePaymentMethods?.isEligible("paypal") ?? false
  const cardEligible = eligibility.eligiblePaymentMethods?.isEligible("card") ?? false

  useEffect(() => {
    logFlightFlow("CheckoutPayStep", "paypal_v6_sdk_status", {
      partialOfferRequestId: data.partialOfferRequestId,
      loadingStatus: paypal.loadingStatus,
    })
  }, [data.partialOfferRequestId, paypal.loadingStatus])

  useEffect(() => {
    if (!sdkError) {
      return
    }

    logFlightFlow("CheckoutPayStep", "paypal_v6_sdk_error", {
      partialOfferRequestId: data.partialOfferRequestId,
      errorMessage: sdkError.message,
    })
  }, [data.partialOfferRequestId, sdkError])

  useEffect(() => {
    if (eligibility.isLoading || !eligibility.eligiblePaymentMethods) {
      return
    }

    logFlightFlow("CheckoutPayStep", "paypal_v6_eligibility_loaded", {
      partialOfferRequestId: data.partialOfferRequestId,
      paypalEligible,
      cardEligible,
      currency: data.payment.chargeCurrency,
      amount,
    })
  }, [
    amount,
    cardEligible,
    data.partialOfferRequestId,
    data.payment.chargeCurrency,
    eligibility.eligiblePaymentMethods,
    eligibility.isLoading,
    paypalEligible,
  ])

  useEffect(() => {
    if (eligibility.isLoading || !eligibility.eligiblePaymentMethods || paypalEligible) {
      return
    }

    logFlightFlow("CheckoutPayStep", "paypal_v6_wallet_ineligible", {
      partialOfferRequestId: data.partialOfferRequestId,
      currency: data.payment.chargeCurrency,
      amount,
    })
  }, [
    amount,
    data.partialOfferRequestId,
    data.payment.chargeCurrency,
    eligibility.eligiblePaymentMethods,
    eligibility.isLoading,
    paypalEligible,
  ])

  useEffect(() => {
    if (eligibility.isLoading || !eligibility.eligiblePaymentMethods || cardEligible) {
      return
    }

    logFlightFlow("CheckoutPayStep", "paypal_v6_guest_card_ineligible", {
      partialOfferRequestId: data.partialOfferRequestId,
      currency: data.payment.chargeCurrency,
      amount,
    })
  }, [
    amount,
    cardEligible,
    data.partialOfferRequestId,
    data.payment.chargeCurrency,
    eligibility.eligiblePaymentMethods,
    eligibility.isLoading,
  ])

  if (loading) {
    return (
      <p className="rounded-md border border-[#d7d8ce] bg-[#f7f8f4] px-3 py-2 text-sm text-[#66706b]">
        Loading payment options
      </p>
    )
  }

  if (sdkError || sdkRejected) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        Payment could not be completed.
      </p>
    )
  }

  if (!paypalEligible && !cardEligible) {
    return (
      <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        PayPal and cards are unavailable for this booking.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {cardEligible ? (
        <div className="space-y-2">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-[#17201d]">Debit or credit card</p>
            <p className="text-xs text-muted-foreground">
              Pay securely by card without a PayPal account.
            </p>
          </div>
          <PayPalGuestPaymentButton
            disabled={disabled}
            createOrder={async () => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_guest_card_session_started", {
                partialOfferRequestId: data.partialOfferRequestId,
              })
              const orderId = await onCreatePayPalOrder()
              logFlightFlow("CheckoutPayStep", "paypal_v6_guest_card_order_created", {
                partialOfferRequestId: data.partialOfferRequestId,
                paypalOrderId: orderId,
              })
              return { orderId }
            }}
            onApprove={async (approvalData) => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_guest_card_approval_received", {
                partialOfferRequestId: data.partialOfferRequestId,
                paypalOrderId: approvalData.orderId,
              })
              await onCapturePayPalOrder(approvalData.orderId)
              logFlightFlow("CheckoutPayStep", "paypal_v6_guest_card_capture_succeeded", {
                partialOfferRequestId: data.partialOfferRequestId,
                paypalOrderId: approvalData.orderId,
              })
            }}
            onCancel={() => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_guest_card_cancelled", {
                partialOfferRequestId: data.partialOfferRequestId,
              })
              onPayPalCancel()
            }}
            onError={(error) => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_guest_card_session_error", {
                partialOfferRequestId: data.partialOfferRequestId,
                errorMessage: error.message,
                errorCode: error.code,
                recoverable: error.isRecoverable,
              })
              onPayPalError(error)
            }}
            onWarn={(warning) => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_guest_card_warning", {
                partialOfferRequestId: data.partialOfferRequestId,
                warningCode: warning.code,
                warningName: warning.name,
                warningMessage: warning.message,
              })
            }}
          />
        </div>
      ) : null}

      {paypalEligible ? (
        <div className="space-y-2">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-[#17201d]">PayPal</p>
            <p className="text-xs text-muted-foreground">
              Pay with your PayPal account.
            </p>
          </div>
          <PayPalOneTimePaymentButton
            type="pay"
            disabled={disabled}
            createOrder={async () => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_payment_session_started", {
                partialOfferRequestId: data.partialOfferRequestId,
              })
              const orderId = await onCreatePayPalOrder()
              logFlightFlow("CheckoutPayStep", "paypal_v6_order_created", {
                partialOfferRequestId: data.partialOfferRequestId,
                paypalOrderId: orderId,
              })
              return { orderId }
            }}
            onApprove={async (approvalData) => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_approval_received", {
                partialOfferRequestId: data.partialOfferRequestId,
                paypalOrderId: approvalData.orderId,
              })
              await onCapturePayPalOrder(approvalData.orderId)
              logFlightFlow("CheckoutPayStep", "paypal_v6_capture_succeeded", {
                partialOfferRequestId: data.partialOfferRequestId,
                paypalOrderId: approvalData.orderId,
              })
            }}
            onCancel={() => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_payment_cancelled", {
                partialOfferRequestId: data.partialOfferRequestId,
              })
              onPayPalCancel()
            }}
            onError={(error) => {
              logFlightFlow("CheckoutPayStep", "paypal_v6_session_error", {
                partialOfferRequestId: data.partialOfferRequestId,
                errorMessage: error.message,
                errorCode: error.code,
                recoverable: error.isRecoverable,
              })
              onPayPalError(error)
            }}
          />
        </div>
      ) : null}

      {!cardEligible ? (
        <p className="rounded-md border border-[#d7d8ce] bg-[#f7f8f4] px-3 py-2 text-xs text-muted-foreground">
          Cards are unavailable for this booking. Use PayPal if available.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Opening a secure PayPal payment window may be required.
      </p>
    </div>
  )
}

function formatPayPalEligibilityAmount(amount: number) {
  return amount.toFixed(2)
}
