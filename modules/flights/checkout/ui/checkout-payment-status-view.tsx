"use client"

import Link from "next/link"
import { AlertTriangleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CheckoutPayNowResolution } from "@/modules/flights/checkout/ui/hooks/use-checkout-flow"

interface CheckoutPaymentStatusViewProps {
  status: "processing" | "success" | "failed" | "reconciliation"
  sessionId: string | undefined
  resolution: CheckoutPayNowResolution | null
  errorMessage: string | null
  onRetryPay: () => void
}

export function CheckoutPaymentStatusView({
  status,
  sessionId,
  resolution,
  errorMessage,
  onRetryPay,
}: CheckoutPaymentStatusViewProps) {
  if (status === "processing") {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Loader2Icon className="size-5 animate-spin" />
            Finalizing your booking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/20 py-8">
            <div className="relative size-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Processing payment...</p>
          </div>
          <p>Payment was received. We are confirming your order with the airline.</p>
          <p>
            This can take a few moments. Keep this page open or refresh if needed.
          </p>
          {sessionId ? <p>Checkout session: {sessionId}</p> : null}
        </CardContent>
      </Card>
    )
  }

  if (status === "success") {
    return (
      <Card className="rounded-2xl border-emerald-500/40 bg-emerald-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2Icon className="size-5 text-emerald-600" />
            Booking confirmed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Duffel order ID: <strong>{resolution?.duffelOrderId ?? "pending"}</strong>
          </p>
          {resolution?.bookingReference ? (
            <p>
              Booking reference: <strong>{resolution.bookingReference}</strong>
            </p>
          ) : null}
          <p>
            Total charged:{" "}
            <strong>{resolution?.totalChargeAmountLabel ?? "Amount unavailable"}</strong>
          </p>
          {sessionId ? <p>Checkout session: {sessionId}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button render={<Link href="/" />}>Start new search</Button>
            <Button variant="outline" onClick={onRetryPay}>
              Back to checkout
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === "reconciliation") {
    return (
      <Card className="rounded-2xl border-amber-500/40 bg-amber-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <AlertTriangleIcon className="size-5 text-amber-600" />
            Payment received, manual confirmation required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {resolution?.message ??
              "We received your payment, but booking confirmation needs manual reconciliation."}
          </p>
          <p>Please contact support with your checkout session ID for faster resolution.</p>
          {sessionId ? <p>Checkout session: {sessionId}</p> : null}
          <Button variant="outline" onClick={onRetryPay}>
            Back to pay step
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-destructive">
          <AlertTriangleIcon className="size-5" />
          Payment not completed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {errorMessage ??
            resolution?.message ??
            "Payment was not completed. Please retry checkout."}
        </p>
        {sessionId ? <p className="text-muted-foreground">Checkout session: {sessionId}</p> : null}
        <Button onClick={onRetryPay}>Retry payment</Button>
      </CardContent>
    </Card>
  )
}
