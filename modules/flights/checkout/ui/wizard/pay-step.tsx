"use client"

import Link from "next/link"
import {
  PayPalButtons,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js"
import { Show } from "@clerk/nextjs"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import type { CheckoutPageData } from "@/modules/flights/checkout/domain"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"

interface CheckoutPayStepProps {
  data: CheckoutPageData
  paymentMode: CheckoutFormValues["paymentMode"] | undefined
  ancillaryPreviewTotal: number
  totalPreview: number
  submitError: string | null
  paymentProcessingMessage: string | null
  isSubmitting: boolean
  clerkEnabled: boolean
  signInHref: string
  onBack: () => void
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
  clerkEnabled,
  signInHref,
  onBack,
  onCreatePayPalOrder,
  onCapturePayPalOrder,
  isBackNavigating = false,
}: CheckoutPayStepProps) {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim()

  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight md:text-xl">
          {paymentMode === "hold" ? "Confirm and pay later" : "Payment"}
        </h2>
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-4 md:p-5">
            <div className="flex items-center justify-between text-sm">
              <span>Fare</span>
              <span>{data.quote.fareSellAmountLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Extras</span>
              <span>{formatPreviewCurrency(ancillaryPreviewTotal, data.quote.currency)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-lg font-semibold md:text-base">
              <span>Total</span>
              <span>
                {paymentMode === "pay_now"
                  ? formatPreviewCurrency(totalPreview, data.payment.chargeCurrency)
                  : formatPreviewCurrency(totalPreview, data.quote.currency)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {paymentMode === "pay_now"
                ? "PayPal charges the exact displayed booking total for this itinerary."
                : "Final amount is revalidated on confirm before order creation."}
            </p>
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
        paypalClientId ? (
          <PayPalScriptProvider
            options={{
              clientId: paypalClientId,
              currency: data.payment.chargeCurrency,
              intent: "capture",
            }}
          >
            <PayPalButtons
              style={{
                layout: "vertical",
                shape: "rect",
                label: "paypal",
              }}
              disabled={isSubmitting}
              forceReRender={[totalPreview, data.payment.chargeCurrency]}
              createOrder={async () => onCreatePayPalOrder()}
              onApprove={async (approvalData) => {
                if (!approvalData.orderID) {
                  throw new Error("PayPal approval did not include an order ID.")
                }

                await onCapturePayPalOrder(approvalData.orderID)
              }}
            />
          </PayPalScriptProvider>
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

function formatPreviewCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency}${amount.toFixed(currency === "JPY" ? 0 : 2)}`
  }
}
