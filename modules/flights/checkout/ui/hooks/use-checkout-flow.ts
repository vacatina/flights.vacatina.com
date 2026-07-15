"use client"

import { useCallback, useRef, useState, useTransition } from "react"

import {
  type CheckoutPageData,
  type CheckoutPassengerInput,
} from "@/modules/flights/checkout/domain"
import {
  capturePayPalOrderAction,
  createPayPalOrderAction,
  getCheckoutSessionStatusAction,
  submitCheckoutAction,
} from "@/modules/flights/checkout/server/actions"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"

interface CheckoutSubmitSuccessState {
  duffelOrderId: string
  bookingReference: string | null
  totalSellAmountLabel: string
  paymentRequiredByLabel: string | null
  paymentMode: "pay_now" | "hold"
}

export interface CheckoutPayNowResolution {
  sessionId: string
  status: "processing" | "success" | "failed" | "reconciliation"
  duffelOrderId: string | null
  bookingReference: string | null
  totalChargeAmountLabel: string | null
  message: string | null
}

interface UseCheckoutFlowInput {
  data: CheckoutPageData
  onSuccess?: (result: CheckoutSubmitSuccessState) => void
  onPayNowResolved?: (resolution: CheckoutPayNowResolution) => void
}

export function useCheckoutFlow(input: UseCheckoutFlowInput) {
  const { data, onSuccess, onPayNowResolved } = input

  const [isSubmitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentProcessingMessage, setPaymentProcessingMessage] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<CheckoutSubmitSuccessState | null>(null)
  const [activePollingSessionId, setActivePollingSessionId] = useState<string | null>(null)
  const activePollingSessionRef = useRef<string | null>(null)
  const paypalOrderSessionRef = useRef(new Map<string, string>())

  const resetFeedback = useCallback(function resetFeedback() {
    setSubmitError(null)
    setSubmitSuccess(null)
    setPaymentProcessingMessage(null)
  }, [])

  const resolveCheckoutSession = useCallback(async function resolveCheckoutSession(
    checkoutSessionId: string
  ): Promise<CheckoutPayNowResolution | null> {
    const result = await getCheckoutSessionStatusAction({
      checkoutSessionId,
    })

    if (!result.ok) {
      setSubmitError(
        toSafeUserErrorMessage(
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
        bookingReference: result.data.bookingReference,
        totalChargeAmountLabel: result.data.totalChargeAmountLabel,
        message: null,
      }
    }

    if (result.data.status === "failed") {
      return {
        sessionId: checkoutSessionId,
        status: "failed",
        duffelOrderId: result.data.duffelOrderId,
        bookingReference: result.data.bookingReference,
        totalChargeAmountLabel: result.data.totalChargeAmountLabel,
        message: result.data.message,
      }
    }

    if (result.data.status === "reconciliation_required") {
      return {
        sessionId: checkoutSessionId,
        status: "reconciliation",
        duffelOrderId: result.data.duffelOrderId,
        bookingReference: result.data.bookingReference,
        totalChargeAmountLabel: result.data.totalChargeAmountLabel,
        message: result.data.message,
      }
    }

    return {
      sessionId: checkoutSessionId,
      status: "processing",
      duffelOrderId: result.data.duffelOrderId,
      bookingReference: result.data.bookingReference,
      totalChargeAmountLabel: result.data.totalChargeAmountLabel,
      message: result.data.message,
    }
  }, [])

  const pollCheckoutCompletion = useCallback(async function pollCheckoutCompletion(
    checkoutSessionId: string
  ) {
    if (activePollingSessionRef.current === checkoutSessionId) {
      return
    }

    activePollingSessionRef.current = checkoutSessionId
    setActivePollingSessionId(checkoutSessionId)
    logFlightFlow("CheckoutPageClient", "checkout_processing_poll_started", {
      partialOfferRequestId: data.partialOfferRequestId,
      checkoutSessionId,
    })

    const maxAttempts = 60
    const intervalMs = 2_000

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const resolution = await resolveCheckoutSession(checkoutSessionId)

        if (!resolution) {
          return
        }

        if (resolution.status === "success") {
          logFlightFlow(
            "CheckoutPageClient",
            "checkout_processing_poll_resolved_completed",
            {
              partialOfferRequestId: data.partialOfferRequestId,
              checkoutSessionId,
              duffelOrderId: resolution.duffelOrderId,
            }
          )

          const success: CheckoutSubmitSuccessState = {
            duffelOrderId: resolution.duffelOrderId ?? "unknown",
            bookingReference: resolution.bookingReference,
            totalSellAmountLabel:
              resolution.totalChargeAmountLabel ?? data.quote.fareSellAmountLabel,
            paymentRequiredByLabel: null,
            paymentMode: "pay_now",
          }
          setSubmitSuccess(success)
          setPaymentProcessingMessage(null)
          onSuccess?.(success)
          onPayNowResolved?.(resolution)
          return
        }

        if (resolution.status === "failed" || resolution.status === "reconciliation") {
          const eventName =
            resolution.status === "failed"
              ? "checkout_processing_poll_resolved_failed"
              : "checkout_processing_poll_resolved_reconciliation"

          logFlightFlow("CheckoutPageClient", eventName, {
            partialOfferRequestId: data.partialOfferRequestId,
            checkoutSessionId,
          })
          setSubmitError(
            toSafeActionMessage(
              resolution.message,
              "Payment was received but booking needs manual reconciliation."
            )
          )
          setPaymentProcessingMessage(null)
          onPayNowResolved?.(resolution)
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
    } finally {
      if (activePollingSessionRef.current === checkoutSessionId) {
        activePollingSessionRef.current = null
      }
      setActivePollingSessionId((current) =>
        current === checkoutSessionId ? null : current
      )
    }
  }, [
    data.partialOfferRequestId,
    data.quote.fareSellAmountLabel,
    onPayNowResolved,
    onSuccess,
    resolveCheckoutSession,
  ])

  const onSubmit = useCallback(function onSubmit(values: CheckoutFormValues) {
    resetFeedback()
    const payload = buildCheckoutPayload({ data, values })

    logFlightFlow("CheckoutPageClient", "submit_clicked", {
      partialOfferRequestId: data.partialOfferRequestId,
      paymentMode: values.paymentMode,
      selectedServicesCount: values.ancillarySelection.services.length,
      metadataCount: values.metadata.length,
    })

    startSubmit(() => {
      void (async () => {
        if (values.paymentMode === "pay_now") {
          setSubmitError("Use the PayPal buttons to complete pay now checkout.")
          return
        }

        const result = await submitCheckoutAction(payload)

        if (!result.ok) {
          setSubmitError(
            toSafeUserErrorMessage(
              result.error.message,
              "Could not complete checkout right now. Please try again."
            )
          )
          return
        }

        const success: CheckoutSubmitSuccessState = {
          duffelOrderId: result.data.duffelOrderId,
          bookingReference: result.data.bookingReference,
          totalSellAmountLabel: result.data.totalSellAmountLabel,
          paymentRequiredByLabel: result.data.paymentRequiredByLabel,
          paymentMode: result.data.paymentMode,
        }
        setSubmitSuccess(success)
        onSuccess?.(success)
      })()
    })
  }, [
    data,
    onSuccess,
    resetFeedback,
  ])

  const createPayPalOrder = useCallback(async function createPayPalOrder(
    values: CheckoutFormValues
  ) {
    resetFeedback()

    if (!data.payment.payNowEnabled) {
      const message = data.payment.unavailableReason ?? "Pay now is unavailable for this fare."
      setSubmitError(message)
      throw new Error(message)
    }

    const payload = buildCheckoutPayload({
      data,
      values: {
        ...values,
        paymentMode: "pay_now",
      },
    })

    const result = await createPayPalOrderAction(payload)

    if (!result.ok) {
      const message = toSafeUserErrorMessage(
        result.error.message,
        "Could not create PayPal order right now. Please try again."
      )
      setSubmitError(message)
      throw new Error(message)
    }

    paypalOrderSessionRef.current.set(
      result.data.paypalOrderId,
      result.data.checkoutSessionId
    )
    setPaymentProcessingMessage(null)
    logFlightFlow("CheckoutPageClient", "paypal_order_created", {
      partialOfferRequestId: data.partialOfferRequestId,
      checkoutSessionId: result.data.checkoutSessionId,
      paypalOrderId: result.data.paypalOrderId,
    })

    return result.data.paypalOrderId
  }, [
    data,
    resetFeedback,
  ])

  const capturePayPalOrder = useCallback(async function capturePayPalOrder(
    paypalOrderId: string
  ) {
    const checkoutSessionId = paypalOrderSessionRef.current.get(paypalOrderId)

    if (!checkoutSessionId) {
      const message = "PayPal order state is incomplete. Please retry payment."
      setSubmitError(message)
      throw new Error(message)
    }

    setPaymentProcessingMessage("Capturing PayPal payment...")
    const result = await capturePayPalOrderAction({
      checkoutSessionId,
      paypalOrderId,
    })

    if (!result.ok) {
      const message = toSafeUserErrorMessage(
        result.error.message,
        "Could not capture PayPal payment right now. Please try again."
      )
      setSubmitError(message)
      setPaymentProcessingMessage(null)
      throw new Error(message)
    }

    const resolution = toPayNowResolution(result.data)

    if (resolution.status === "success") {
      const success: CheckoutSubmitSuccessState = {
        duffelOrderId: resolution.duffelOrderId ?? "unknown",
        bookingReference: resolution.bookingReference,
        totalSellAmountLabel:
          resolution.totalChargeAmountLabel ?? data.quote.fareSellAmountLabel,
        paymentRequiredByLabel: null,
        paymentMode: "pay_now",
      }
      setSubmitSuccess(success)
      setPaymentProcessingMessage(null)
      onSuccess?.(success)
      onPayNowResolved?.(resolution)
      return resolution
    }

    if (resolution.status === "failed" || resolution.status === "reconciliation") {
      setSubmitError(
        toSafeActionMessage(
          resolution.message,
          "Payment was received but booking needs manual reconciliation."
        )
      )
      setPaymentProcessingMessage(null)
      onPayNowResolved?.(resolution)
      return resolution
    }

    setPaymentProcessingMessage("Payment is processing. Waiting for confirmation...")
    onPayNowResolved?.(resolution)
    await pollCheckoutCompletion(checkoutSessionId)
    return resolution
  }, [
    data.quote.fareSellAmountLabel,
    onPayNowResolved,
    onSuccess,
    pollCheckoutCompletion,
  ])

  const syncPayNowResolution = useCallback(async function syncPayNowResolution(
    checkoutSessionId: string
  ) {
    return resolveCheckoutSession(checkoutSessionId)
  }, [resolveCheckoutSession])

  const resumePayNowProcessing = useCallback(async function resumePayNowProcessing(
    checkoutSessionId: string
  ) {
    setPaymentProcessingMessage("Payment is processing. Waiting for confirmation...")
    await pollCheckoutCompletion(checkoutSessionId)
  }, [pollCheckoutCompletion])

  return {
    isSubmitting,
    submitError,
    setSubmitError,
    paymentProcessingMessage,
    submitSuccess,
    activePollingSessionId,
    capturePayPalOrder,
    createPayPalOrder,
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
  return toSafeUserErrorMessage(message, fallback)
}

function buildCheckoutPayload(input: {
  data: CheckoutPageData
  values: CheckoutFormValues
}) {
  const passengers: CheckoutPassengerInput[] = input.values.passengers.map((passenger) => {
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

  return {
    partialOfferRequestId: input.data.partialOfferRequestId,
    offerId: input.data.state.offerId,
    quoteId: input.data.state.quoteId,
    selectedPartialOffers: input.data.state.selectedPartialOffers,
    paymentMode: input.values.paymentMode,
    contact: input.values.contact,
    passengers,
    metadata: input.values.metadata,
    ancillarySelection:
      input.values.ancillarySelection.services.length > 0
        ? input.values.ancillarySelection
        : null,
  } as const
}

function toPayNowResolution(
  result: import("@/modules/flights/checkout/domain").CheckoutSessionStatusResult
): CheckoutPayNowResolution {
  if (result.status === "completed") {
    return {
      sessionId: result.checkoutSessionId,
      status: "success",
      duffelOrderId: result.duffelOrderId,
      bookingReference: result.bookingReference,
      totalChargeAmountLabel: result.totalChargeAmountLabel,
      message: null,
    }
  }

  if (result.status === "failed") {
    return {
      sessionId: result.checkoutSessionId,
      status: "failed",
      duffelOrderId: result.duffelOrderId,
      bookingReference: result.bookingReference,
      totalChargeAmountLabel: result.totalChargeAmountLabel,
      message: result.message,
    }
  }

  if (result.status === "reconciliation_required") {
    return {
      sessionId: result.checkoutSessionId,
      status: "reconciliation",
      duffelOrderId: result.duffelOrderId,
      bookingReference: result.bookingReference,
      totalChargeAmountLabel: result.totalChargeAmountLabel,
      message: result.message,
    }
  }

  return {
    sessionId: result.checkoutSessionId,
    status: "processing",
    duffelOrderId: result.duffelOrderId,
    bookingReference: result.bookingReference,
    totalChargeAmountLabel: result.totalChargeAmountLabel,
    message: result.message,
  }
}
