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
import {
  ensurePayHereSdk,
  startPayHerePayment,
} from "@/modules/flights/checkout/ui/payhere-client"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"

interface CheckoutSubmitSuccessState {
  duffelOrderId: string
  totalSellAmountLabel: string
  paymentRequiredByLabel: string | null
  paymentMode: "pay_now" | "hold"
}

export interface CheckoutPayNowResolution {
  sessionId: string
  status: "processing" | "success" | "failed" | "reconciliation"
  duffelOrderId: string | null
  totalChargeAmountLabel: string | null
  message: string | null
}

interface UseCheckoutFlowInput {
  data: CheckoutPageData
  onSuccess?: (result: CheckoutSubmitSuccessState) => void
  onPayNowProcessingStart?: (sessionId: string) => void
  onPayNowResolved?: (resolution: CheckoutPayNowResolution) => void
  onPayNowDismissed?: () => void
}

export function useCheckoutFlow(input: UseCheckoutFlowInput) {
  const [isSubmitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentProcessingMessage, setPaymentProcessingMessage] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<CheckoutSubmitSuccessState | null>(null)
  const [activePollingSessionId, setActivePollingSessionId] = useState<string | null>(null)

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
              logFlightFlow("CheckoutPageClient", "payment_popup_completed_redirected_processing", {
                partialOfferRequestId: input.data.partialOfferRequestId,
                checkoutSessionId: startResult.data.checkoutSessionId,
              })
              setPaymentProcessingMessage(
                "Payment received. Finalizing booking with airline..."
              )
              input.onPayNowProcessingStart?.(startResult.data.checkoutSessionId)
              void pollCheckoutCompletion(startResult.data.checkoutSessionId)
            },
            onDismissed: () => {
              logFlightFlow("CheckoutPageClient", "checkout_popup_dismissed_returned_pay_step", {
                partialOfferRequestId: input.data.partialOfferRequestId,
              })
              setPaymentProcessingMessage(null)
              setSubmitError("Payment window was dismissed before confirmation.")
              input.onPayNowDismissed?.()
            },
            onError: (error) => {
              logFlightFlow("CheckoutPageClient", "payhere_sdk_error", {
                partialOfferRequestId: input.data.partialOfferRequestId,
                errorType: typeof error,
              })
              setPaymentProcessingMessage(null)
              setSubmitError("Payment failed to start. Please try again.")
              input.onPayNowDismissed?.()
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
    if (activePollingSessionId === checkoutSessionId) {
      return
    }

    setActivePollingSessionId(checkoutSessionId)
    logFlightFlow("CheckoutPageClient", "checkout_processing_poll_started", {
      partialOfferRequestId: input.data.partialOfferRequestId,
      checkoutSessionId,
    })

    const maxAttempts = 60
    const intervalMs = 2_000

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const resolution = await resolveCheckoutSession(checkoutSessionId)

      if (!resolution) {
        setActivePollingSessionId(null)
        return
      }

      if (resolution.status === "success") {
        logFlightFlow(
          "CheckoutPageClient",
          "checkout_processing_poll_resolved_completed",
          {
            partialOfferRequestId: input.data.partialOfferRequestId,
            checkoutSessionId,
            duffelOrderId: resolution.duffelOrderId,
          }
        )

        const success: CheckoutSubmitSuccessState = {
          duffelOrderId: resolution.duffelOrderId ?? "unknown",
          totalSellAmountLabel:
            resolution.totalChargeAmountLabel ?? input.data.quote.fareSellAmountLabel,
          paymentRequiredByLabel: null,
          paymentMode: "pay_now",
        }
        setSubmitSuccess(success)
        setPaymentProcessingMessage(null)
        input.onSuccess?.(success)
        input.onPayNowResolved?.(resolution)
        setActivePollingSessionId(null)
        return
      }

      if (resolution.status === "failed" || resolution.status === "reconciliation") {
        const eventName =
          resolution.status === "failed"
            ? "checkout_processing_poll_resolved_failed"
            : "checkout_processing_poll_resolved_reconciliation"

        logFlightFlow("CheckoutPageClient", eventName, {
          partialOfferRequestId: input.data.partialOfferRequestId,
          checkoutSessionId,
        })
        setSubmitError(
          toSafeActionMessage(
            resolution.message,
            "Payment was received but booking needs manual reconciliation."
          )
        )
        setPaymentProcessingMessage(null)
        input.onPayNowResolved?.(resolution)
        setActivePollingSessionId(null)
        return
      }

      await wait(intervalMs)
    }

    setSubmitError(
      "Payment confirmation is taking longer than expected. Please refresh this page in a moment."
    )
    setPaymentProcessingMessage(
      "Payment is still being finalized. You can refresh this page in a moment."
    )
    setActivePollingSessionId(null)
  }

  async function resolveCheckoutSession(
    checkoutSessionId: string
  ): Promise<CheckoutPayNowResolution | null> {
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
      return null
    }

    if (result.data.status === "completed") {
      return {
        sessionId: checkoutSessionId,
        status: "success",
        duffelOrderId: result.data.duffelOrderId,
        totalChargeAmountLabel: result.data.totalChargeAmountLabel,
        message: null,
      }
    }

    if (result.data.status === "failed") {
      return {
        sessionId: checkoutSessionId,
        status: "failed",
        duffelOrderId: result.data.duffelOrderId,
        totalChargeAmountLabel: result.data.totalChargeAmountLabel,
        message: result.data.message,
      }
    }

    if (result.data.status === "reconciliation_required") {
      return {
        sessionId: checkoutSessionId,
        status: "reconciliation",
        duffelOrderId: result.data.duffelOrderId,
        totalChargeAmountLabel: result.data.totalChargeAmountLabel,
        message: result.data.message,
      }
    }

    return {
      sessionId: checkoutSessionId,
      status: "processing",
      duffelOrderId: result.data.duffelOrderId,
      totalChargeAmountLabel: result.data.totalChargeAmountLabel,
      message: result.data.message,
    }
  }

  async function syncPayNowResolution(checkoutSessionId: string) {
    return resolveCheckoutSession(checkoutSessionId)
  }

  async function resumePayNowProcessing(checkoutSessionId: string) {
    setPaymentProcessingMessage("Payment is processing. Waiting for confirmation...")
    await pollCheckoutCompletion(checkoutSessionId)
  }

  return {
    isSubmitting,
    submitError,
    setSubmitError,
    paymentProcessingMessage,
    submitSuccess,
    activePollingSessionId,
    onSubmit,
    resetFeedback,
    syncPayNowResolution,
    resumePayNowProcessing,
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
