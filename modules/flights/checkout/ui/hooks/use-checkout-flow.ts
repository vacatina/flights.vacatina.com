"use client"

import { useState, useTransition } from "react"

import {
  type CheckoutPageData,
  type CheckoutPassengerInput,
} from "@/modules/flights/checkout/domain"
import {
  getCheckoutSessionStatusAction,
  startCheckoutPaymentAction,
  submitCheckoutAction,
} from "@/modules/flights/checkout/server/actions"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import { ensurePayHereSdk, startPayHerePayment } from "@/modules/flights/checkout/ui/payhere-client"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"

interface CheckoutSubmitSuccessState {
  duffelOrderId: string
  totalSellAmountLabel: string
  paymentRequiredByLabel: string | null
  paymentMode: "pay_now" | "hold"
}

interface UseCheckoutFlowInput {
  data: CheckoutPageData
  onSuccess?: (result: CheckoutSubmitSuccessState) => void
}

export function useCheckoutFlow(input: UseCheckoutFlowInput) {
  const [isSubmitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentProcessingMessage, setPaymentProcessingMessage] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<CheckoutSubmitSuccessState | null>(null)

  function resetFeedback() {
    setSubmitError(null)
    setSubmitSuccess(null)
    setPaymentProcessingMessage(null)
  }

  function onSubmit(values: CheckoutFormValues) {
    resetFeedback()

    const passengers: CheckoutPassengerInput[] = values.passengers.map((passenger) => {
      const identityDocument =
        passenger.identityNumber.trim() &&
        passenger.identityCountryCode.trim() &&
        passenger.identityExpiresOn.trim()
          ? {
              type: passenger.identityType,
              uniqueIdentifier: passenger.identityNumber.trim(),
              issuingCountryCode: passenger.identityCountryCode.trim().toUpperCase(),
              expiresOn: passenger.identityExpiresOn.trim(),
            }
          : null

      return {
        id: passenger.id,
        type: passenger.type,
        title: passenger.title,
        givenName: passenger.givenName,
        familyName: passenger.familyName,
        bornOn: passenger.bornOn,
        gender: passenger.gender,
        identityDocument,
      }
    })

    const payload = {
      partialOfferRequestId: input.data.partialOfferRequestId,
      offerId: input.data.state.offerId,
      quoteId: input.data.state.quoteId,
      selectedPartialOffers: input.data.state.selectedPartialOffers,
      paymentMode: values.paymentMode,
      contact: values.contact,
      billing: values.billing,
      passengers,
      metadata: values.metadata,
      ancillarySelection:
        values.ancillarySelection.services.length > 0
          ? values.ancillarySelection
          : null,
    } as const

    logFlightFlow("CheckoutPageClient", "submit_clicked", {
      partialOfferRequestId: input.data.partialOfferRequestId,
      paymentMode: values.paymentMode,
      selectedServicesCount: values.ancillarySelection.services.length,
      metadataCount: values.metadata.length,
    })

    startSubmit(() => {
      void (async () => {
        if (values.paymentMode === "pay_now") {
          if (!input.data.payHere.payNowEnabled) {
            setSubmitError(
              input.data.payHere.unavailableReason ?? "Pay now is unavailable for this fare."
            )
            return
          }

          const startResult = await startCheckoutPaymentAction(payload)

          if (!startResult.ok) {
            setSubmitError(
              toSafeActionMessage(
                startResult.error.message,
                "Could not start payment right now. Please try again."
              )
            )
            return
          }

          setPaymentProcessingMessage("Opening PayHere payment window...")

          try {
            await ensurePayHereSdk(input.data.payHere.scriptUrl)
          } catch (error) {
            setSubmitError(
              error instanceof Error
                ? toSafeActionMessage(
                    error.message,
                    "Could not load PayHere payment SDK."
                  )
                : "Could not load PayHere payment SDK."
            )
            setPaymentProcessingMessage(null)
            return
          }

          startPayHerePayment({
            payload: startResult.data.payment,
            onCompleted: () => {
              setPaymentProcessingMessage(
                "Payment received. Finalizing booking with airline..."
              )
              void pollCheckoutCompletion(startResult.data.checkoutSessionId)
            },
            onDismissed: () => {
              setPaymentProcessingMessage(null)
              setSubmitError("Payment window was dismissed before confirmation.")
            },
            onError: (error) => {
              logFlightFlow("CheckoutPageClient", "payhere_sdk_error", {
                partialOfferRequestId: input.data.partialOfferRequestId,
                errorType: typeof error,
              })
              setPaymentProcessingMessage(null)
              setSubmitError("Payment failed to start. Please try again.")
            },
          })
          return
        }

        const result = await submitCheckoutAction(payload)

        if (!result.ok) {
          setSubmitError(
            toSafeActionMessage(
              result.error.message,
              "Could not complete checkout right now. Please try again."
            )
          )
          return
        }

        const success: CheckoutSubmitSuccessState = {
          duffelOrderId: result.data.duffelOrderId,
          totalSellAmountLabel: result.data.totalSellAmountLabel,
          paymentRequiredByLabel: result.data.paymentRequiredByLabel,
          paymentMode: result.data.paymentMode,
        }
        setSubmitSuccess(success)
        input.onSuccess?.(success)
      })()
    })
  }

  async function pollCheckoutCompletion(checkoutSessionId: string) {
    const maxAttempts = 60
    const intervalMs = 2_000

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = await getCheckoutSessionStatusAction({
        checkoutSessionId,
      })

      if (!result.ok) {
        setSubmitError(
          toSafeActionMessage(
            result.error.message,
            "Could not confirm payment right now. Please refresh and try again."
          )
        )
        setPaymentProcessingMessage(null)
        return
      }

      if (result.data.status === "completed") {
        const success: CheckoutSubmitSuccessState = {
          duffelOrderId: result.data.duffelOrderId ?? "unknown",
          totalSellAmountLabel:
            result.data.totalChargeAmountLabel ?? input.data.quote.fareSellAmountLabel,
          paymentRequiredByLabel: null,
          paymentMode: "pay_now",
        }
        setSubmitSuccess(success)
        setPaymentProcessingMessage(null)
        input.onSuccess?.(success)
        return
      }

      if (
        result.data.status === "failed" ||
        result.data.status === "reconciliation_required"
      ) {
        setSubmitError(
          toSafeActionMessage(
            result.data.message,
            "Payment was received but booking needs manual reconciliation."
          )
        )
        setPaymentProcessingMessage(null)
        return
      }

      await wait(intervalMs)
    }

    setSubmitError(
      "Payment confirmation is taking longer than expected. Please refresh this page in a moment."
    )
    setPaymentProcessingMessage(null)
  }

  return {
    isSubmitting,
    submitError,
    setSubmitError,
    paymentProcessingMessage,
    submitSuccess,
    onSubmit,
    resetFeedback,
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function toSafeActionMessage(message: string | null | undefined, fallback: string) {
  if (!message) {
    return fallback
  }

  const normalized = message.trim()

  if (!normalized) {
    return fallback
  }

  const blockedFragments = [
    "Failed query:",
    "insert into",
    "select ",
    "update ",
    "delete from",
    "violates",
    "stack",
  ]

  if (
    blockedFragments.some((fragment) =>
      normalized.toLowerCase().includes(fragment.toLowerCase())
    )
  ) {
    return fallback
  }

  return normalized
}
