"use client"

import {
  INSTANCE_LOADING_STATE,
  PayPalGuestPaymentButton,
  PayPalOneTimePaymentButton,
  PayPalProvider,
  useEligibleMethods,
  usePayPal,
} from "@paypal/react-paypal-js/sdk-v6"

interface HotelPayPalCheckoutProps {
  clientId: string
  amount: number
  currency: string
  disabled: boolean
  onCreatePayPalOrder: () => Promise<string>
  onCapturePayPalOrder: (paypalOrderId: string) => Promise<void>
  onPayPalCancel: () => void
  onPayPalError: (error: unknown) => void
}

export function HotelPayPalCheckout({
  clientId,
  amount,
  currency,
  disabled,
  onCreatePayPalOrder,
  onCapturePayPalOrder,
  onPayPalCancel,
  onPayPalError,
}: HotelPayPalCheckoutProps) {
  return (
    <PayPalProvider
      clientId={clientId}
      environment="sandbox" // Using sandbox for LiteAPI sandbox
      components={["paypal-payments", "paypal-guest-payments"]}
      pageType="checkout"
      debug={true}
    >
      <HotelPayPalControls
        amount={amount}
        currency={currency}
        disabled={disabled}
        onCreatePayPalOrder={onCreatePayPalOrder}
        onCapturePayPalOrder={onCapturePayPalOrder}
        onPayPalCancel={onPayPalCancel}
        onPayPalError={onPayPalError}
      />
    </PayPalProvider>
  )
}

function HotelPayPalControls({
  amount,
  currency,
  disabled,
  onCreatePayPalOrder,
  onCapturePayPalOrder,
  onPayPalCancel,
  onPayPalError,
}: Omit<HotelPayPalCheckoutProps, "clientId">) {
  const paypal = usePayPal()
  
  // Basic implementation similar to flights
  const eligibility = useEligibleMethods({
    payload: {
      currencyCode: currency,
      amount: amount.toString(),
    },
  })

  const sdkRejected = paypal.loadingStatus === INSTANCE_LOADING_STATE.REJECTED
  const sdkError = paypal.error ?? eligibility.error
  const loading = paypal.loadingStatus === INSTANCE_LOADING_STATE.PENDING || eligibility.isLoading
  const paypalEligible = eligibility.eligiblePaymentMethods?.isEligible("paypal") ?? false
  const cardEligible = eligibility.eligiblePaymentMethods?.isEligible("card") ?? false

  if (loading) return <p className="text-sm text-muted-foreground">Loading payment options...</p>
  if (sdkError || sdkRejected) return <p className="text-sm text-destructive">Payment could not be completed.</p>
  if (!paypalEligible && !cardEligible) return <p className="text-sm text-amber-800">PayPal and cards are unavailable.</p>

  return (
    <div className="space-y-4">
      {cardEligible && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Debit or credit card</p>
          <PayPalGuestPaymentButton
            disabled={disabled}
            createOrder={async () => {
              const orderId = await onCreatePayPalOrder()
              return { orderId }
            }}
            onApprove={async (data) => {
              if (data.orderID) await onCapturePayPalOrder(data.orderID)
            }}
            onCancel={onPayPalCancel}
            onError={onPayPalError}
          />
        </div>
      )}
      {paypalEligible && (
        <div className="space-y-2">
          <p className="text-sm font-medium">PayPal</p>
          <PayPalOneTimePaymentButton
            disabled={disabled}
            createOrder={async () => {
              const orderId = await onCreatePayPalOrder()
              return { orderId }
            }}
            onApprove={async (data) => {
              if (data.orderID) await onCapturePayPalOrder(data.orderID)
            }}
            onCancel={onPayPalCancel}
            onError={onPayPalError}
          />
        </div>
      )}
    </div>
  )
}
