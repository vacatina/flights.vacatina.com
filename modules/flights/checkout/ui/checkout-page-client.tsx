"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useFieldArray, useForm, useWatch } from "react-hook-form"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import {
  toCheckoutUrlSearchParams,
  type CheckoutPageData,
  type CheckoutPaymentUiStatus,
  type CheckoutWizardStep,
} from "@/modules/flights/checkout/domain"
import { CheckoutPaymentStatusView } from "@/modules/flights/checkout/ui/checkout-payment-status-view"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"
import { useCheckoutDraftPersistence } from "@/modules/flights/checkout/ui/hooks/use-checkout-draft-persistence"
import {
  useCheckoutFlow,
  type CheckoutPayNowResolution,
} from "@/modules/flights/checkout/ui/hooks/use-checkout-flow"
import { useCheckoutStepRouting } from "@/modules/flights/checkout/ui/hooks/use-checkout-step-routing"
import {
  CheckoutExtrasStep,
  CheckoutPayStep,
  CheckoutTravelerStep,
  CheckoutWizardShell,
} from "@/modules/flights/checkout/ui/wizard"

interface CheckoutPageClientProps {
  data: CheckoutPageData
  clerkEnabled: boolean
}

export function CheckoutPageClient({ data, clerkEnabled }: CheckoutPageClientProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [stepError, setStepError] = useState<string | null>(null)
  const [isStepNavigating, startStepNavigation] = useTransition()
  const [stepNavigationIntent, setStepNavigationIntent] = useState<
    "traveler_continue" | "extras_back" | "extras_continue" | "pay_back" | "wizard_step" | null
  >(null)
  const [payNowResolution, setPayNowResolution] =
    useState<CheckoutPayNowResolution | null>(null)
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(buildRedirectPath(pathname, searchParams.toString()))}`
  const navigateToBookingDetail = useCallback(
    (bookingReference: string) => {
      router.push(`/booking/${encodeURIComponent(bookingReference)}`)
    },
    [router]
  )

  const form = useForm<CheckoutFormValues>({
    defaultValues: {
      paymentMode:
        data.payment.payNowEnabled || !data.paymentRequirements.canHold
          ? "pay_now"
          : "hold",
      contact: {
        email: "",
        phoneNumber: "",
      },
      passengers: data.passengerDefaults.map((passenger) => ({
        id: passenger.id,
        type: passenger.type,
        title: "mr",
        givenName: "",
        familyName: "",
        bornOn: "",
        gender: "m",
        identityType: "passport",
        identityNumber: "",
        identityCountryCode: "",
        identityExpiresOn: "",
      })),
      metadata: [{ key: "", value: "" }],
      ancillarySelection: {
        services: [],
        metadata: null,
      },
    },
  })
  const metadataFieldArray = useFieldArray({
    control: form.control,
    name: "metadata",
  })

  const paymentMode = useWatch({
    control: form.control,
    name: "paymentMode",
  })
  const ancillarySelection = useWatch({
    control: form.control,
    name: "ancillarySelection",
  })
  const passengersWatch = useWatch({
    control: form.control,
    name: "passengers",
  })
  const contactWatch = useWatch({
    control: form.control,
    name: "contact",
  })

  const buildCheckoutHref = useCallback(
    (input: {
      step: CheckoutWizardStep
      status?: CheckoutPaymentUiStatus
      sessionId?: string
      cancelled?: boolean
    }) => {
      const params = toCheckoutUrlSearchParams({
        ...data.state,
        step: input.step,
        status: input.status,
        sessionId: input.sessionId,
        cancelled: input.cancelled,
      })
      return `/results/${data.partialOfferRequestId}/checkout?${params.toString()}`
    },
    [data.partialOfferRequestId, data.state]
  )

  const checkoutFlow = useCheckoutFlow({
    data,
    onPayNowResolved: (resolution) => {
      setPayNowResolution(resolution)
      if (resolution.status === "success" && resolution.bookingReference) {
        navigateToBookingDetail(resolution.bookingReference)
        return
      }
      router.replace(
        buildCheckoutHref({
          step: "pay",
          status: mapResolutionStatusToQueryStatus(resolution.status),
          sessionId: resolution.sessionId,
        })
      )
    },
  })
  const {
    activePollingSessionId,
    capturePayPalOrder,
    createPayPalOrder,
    isSubmitting,
    onSubmit,
    paymentProcessingMessage,
    resumePayNowProcessing,
    setSubmitError,
    submitError,
    submitSuccess,
    syncPayNowResolution,
  } = checkoutFlow
  const stepRouting = useCheckoutStepRouting({
    partialOfferRequestId: data.partialOfferRequestId,
    state: data.state,
  })

  const draftKey = useMemo(
    () =>
      `checkout-draft:${data.partialOfferRequestId}:${data.state.quoteId}:${data.state.offerId}`,
    [data.partialOfferRequestId, data.state.offerId, data.state.quoteId]
  )

  const { clearDraft } = useCheckoutDraftPersistence({
    form,
    draftKey,
    enabled: !submitSuccess,
  })

  const ancillaryPreviewTotal = useMemo(
    () => computeAncillaryPreviewTotal(ancillarySelection?.metadata ?? null),
    [ancillarySelection?.metadata]
  )
  const totalPreview = data.quote.fareSellAmount + ancillaryPreviewTotal
  const currentStatus = data.state.status
  const currentSessionId = data.state.sessionId
  const resolvedCurrentSessionStatus =
    payNowResolution && payNowResolution.sessionId === currentSessionId
      ? mapResolutionStatusToQueryStatus(payNowResolution.status)
      : null
  const effectiveStatus = resolvedCurrentSessionStatus ?? currentStatus
  const statusModeActive = Boolean(effectiveStatus && currentSessionId)
  const fallbackMissingSessionMessage =
    data.state.status && !data.state.sessionId
      ? "Payment status link is incomplete. Please retry payment from the pay step."
      : null

  const travelerStepReady = useMemo(
    () =>
      validateTravelerStep({
        paymentMode,
        contact: contactWatch,
        passengers: passengersWatch,
        identityDocumentsRequired: data.identityDocumentsRequired,
      }),
    [
      contactWatch,
      data.identityDocumentsRequired,
      passengersWatch,
      paymentMode,
    ]
  )

  useEffect(() => {
    if (paymentMode !== "hold") {
      return
    }

    if ((ancillarySelection?.services?.length ?? 0) === 0) {
      return
    }

    form.setValue("ancillarySelection", {
      services: [],
      metadata: null,
    })
  }, [paymentMode, ancillarySelection?.services?.length, form])

  useEffect(() => {
    if (!submitSuccess) {
      return
    }

    clearDraft()
  }, [submitSuccess, clearDraft])

  useEffect(() => {
    logFlightFlow("CheckoutPageClient", "hydrated", {
      partialOfferRequestId: data.partialOfferRequestId,
      step: stepRouting.currentStep,
      status: currentStatus,
      selectedCount: data.state.selectedPartialOffers.length,
      payNowEnabled: data.payment.payNowEnabled,
    })
  }, [
    currentStatus,
    data.partialOfferRequestId,
    data.payment.payNowEnabled,
    data.state.selectedPartialOffers.length,
    stepRouting.currentStep,
  ])

  useEffect(() => {
    if (!data.state.status) {
      return
    }

    if (!data.state.sessionId) {
      if (data.state.status === "processing") {
        router.replace(
          buildCheckoutHref({
            step: "pay",
          })
        )
      }

      return
    }

    if (
      payNowResolution &&
      payNowResolution.sessionId === data.state.sessionId
    ) {
      const canonicalStatus = mapResolutionStatusToQueryStatus(payNowResolution.status)

      if (payNowResolution.status === "success" && payNowResolution.bookingReference) {
        navigateToBookingDetail(payNowResolution.bookingReference)
        return
      }

      if (canonicalStatus === "processing") {
        if (data.state.status !== "processing") {
          router.replace(
            buildCheckoutHref({
              step: "pay",
              status: canonicalStatus,
              sessionId: data.state.sessionId,
            })
          )
        }

        if (activePollingSessionId !== data.state.sessionId) {
          void resumePayNowProcessing(data.state.sessionId)
        }
        return
      }

      if (canonicalStatus !== data.state.status) {
        router.replace(
          buildCheckoutHref({
            step: "pay",
            status: canonicalStatus,
            sessionId: data.state.sessionId,
          })
        )
      }
      return
    }

    if (data.state.status === "processing") {
      if (activePollingSessionId === data.state.sessionId) {
        return
      }

      void resumePayNowProcessing(data.state.sessionId)
      return
    }

    void (async () => {
      const resolution = await syncPayNowResolution(data.state.sessionId ?? "")

      if (!resolution) {
        return
      }

      setPayNowResolution(resolution)
      if (resolution.status === "success" && resolution.bookingReference) {
        navigateToBookingDetail(resolution.bookingReference)
        return
      }

      const canonicalStatus = mapResolutionStatusToQueryStatus(resolution.status)

      if (canonicalStatus !== data.state.status) {
        router.replace(
          buildCheckoutHref({
            step: "pay",
            status: canonicalStatus,
            sessionId: data.state.sessionId,
          })
        )
      }
    })()
  }, [
    activePollingSessionId,
    buildCheckoutHref,
    navigateToBookingDetail,
    data.state.sessionId,
    data.state.status,
    payNowResolution,
    resumePayNowProcessing,
    router,
    syncPayNowResolution,
  ])

  useEffect(() => {
    if (effectiveStatus !== "success") {
      return
    }

    logFlightFlow("CheckoutPageClient", "checkout_confirmation_rendered", {
      partialOfferRequestId: data.partialOfferRequestId,
      checkoutSessionId: currentSessionId,
      duffelOrderId: payNowResolution?.duffelOrderId ?? null,
    })
  }, [
    currentSessionId,
    data.partialOfferRequestId,
    effectiveStatus,
    payNowResolution?.duffelOrderId,
  ])

  function canNavigateToStep(step: CheckoutWizardStep) {
    if (isSubmitting || isStepNavigating) {
      return false
    }

    if (step === "traveler") {
      return true
    }

    return travelerStepReady
  }

  function navigateStep(step: CheckoutWizardStep) {
    if (!canNavigateToStep(step)) {
      setStepError("Complete required traveler details before continuing.")
      return
    }

    setStepError(null)
    setStepNavigationIntent("wizard_step")
    startStepNavigation(() => {
      stepRouting.navigateStep(step)
    })
  }

  function continueFromTraveler() {
    if (!travelerStepReady) {
      setStepError("Complete required traveler details before continuing.")
      return
    }

    setStepError(null)
    setStepNavigationIntent("traveler_continue")
    startStepNavigation(() => {
      stepRouting.goNextStep()
    })
  }

  function continueFromExtras() {
    setStepError(null)
    setStepNavigationIntent("extras_continue")
    startStepNavigation(() => {
      stepRouting.goNextStep()
    })
  }

  function backFromExtras() {
    setStepError(null)
    setStepNavigationIntent("extras_back")
    startStepNavigation(() => {
      stepRouting.goPreviousStep()
    })
  }

  function backFromPay() {
    setStepError(null)
    setStepNavigationIntent("pay_back")
    startStepNavigation(() => {
      stepRouting.goPreviousStep()
    })
  }

  function onRetryPayStep() {
    setPayNowResolution(null)
    setSubmitError(null)
    router.replace(
      buildCheckoutHref({
        step: "pay",
      })
    )
  }

  const effectiveStep: CheckoutWizardStep =
    data.state.status && !data.state.sessionId ? "pay" : stepRouting.currentStep

  const payStepError = checkoutFlow.submitError ?? fallbackMissingSessionMessage
  const payStepBanner = data.state.cancelled
    ? "PayPal checkout was cancelled before payment confirmation."
    : null

  return (
    <main className="min-h-svh bg-muted/40 py-6 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>Flights</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="text-muted-foreground">
                  {data.tripSummary.routeLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Checkout</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-card px-3 py-1">{data.tripSummary.journeyTypeLabel}</span>
            <span className="rounded-full bg-card px-3 py-1">{data.tripSummary.dateRangeLabel}</span>
            <span className="rounded-full bg-card px-3 py-1">{data.tripSummary.passengersLabel}</span>
            <span className="rounded-full bg-card px-3 py-1">{data.tripSummary.cabinLabel}</span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {data.tripSummary.routeLabel}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.tripSummary.offerExpiresAtLabel
                ? `This offer will expire on ${data.tripSummary.offerExpiresAtLabel}`
                : "Offer expiry time unavailable"}
            </p>
          </div>

      {submitSuccess?.paymentMode === "hold" ? (
            <Card className="rounded-2xl border-emerald-500/40 bg-emerald-50/30">
              <CardHeader>
                <CardTitle className="text-xl">Order created successfully</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Duffel order ID: <strong>{submitSuccess.duffelOrderId}</strong>
                </p>
                <p>
                  Total charged: <strong>{submitSuccess.totalSellAmountLabel}</strong>
                </p>
                {submitSuccess.paymentRequiredByLabel ? (
                  <p>
                    Payment required by:{" "}
                    <strong>{submitSuccess.paymentRequiredByLabel}</strong>
                  </p>
                ) : null}
                {submitSuccess.bookingReference ? (
                  <Button
                    className="mt-2"
                    render={
                      <Link
                        href={`/booking/${encodeURIComponent(submitSuccess.bookingReference)}`}
                      />
                    }
                  >
                    View booking
                  </Button>
                ) : null}
                <Button className="mt-2" render={<Link href="/" />}>
                  Start new search
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {statusModeActive && effectiveStatus ? (
            <CheckoutPaymentStatusView
              status={effectiveStatus}
              sessionId={currentSessionId}
              resolution={payNowResolution}
              errorMessage={submitError}
              onRetryPay={onRetryPayStep}
            />
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <CheckoutWizardShell
                currentStep={effectiveStep}
                onStepChange={navigateStep}
                canNavigateToStep={canNavigateToStep}
              >
                {effectiveStep === "traveler" ? (
                  <CheckoutTravelerStep
                    data={data}
                    form={form}
                    paymentMode={paymentMode}
                    passengers={passengersWatch}
                    ancillaryServicesCount={ancillarySelection?.services.length ?? 0}
                    stepError={stepError}
                    onContinue={continueFromTraveler}
                    disabled={isSubmitting || isStepNavigating}
                    isNavigating={
                      isStepNavigating && stepNavigationIntent === "traveler_continue"
                    }
                  />
                ) : null}

                {effectiveStep === "extras" ? (
                  <CheckoutExtrasStep
                    data={data}
                    form={form}
                    metadataFieldArray={metadataFieldArray}
                    paymentMode={paymentMode}
                    onBack={backFromExtras}
                    onContinue={continueFromExtras}
                    disabled={isSubmitting || isStepNavigating}
                    isBackNavigating={
                      isStepNavigating && stepNavigationIntent === "extras_back"
                    }
                    isContinueNavigating={
                      isStepNavigating && stepNavigationIntent === "extras_continue"
                    }
                  />
                ) : null}

                {effectiveStep === "pay" ? (
                  <CheckoutPayStep
                    data={data}
                    paymentMode={paymentMode}
                    ancillaryPreviewTotal={ancillaryPreviewTotal}
                    totalPreview={totalPreview}
                    submitError={payStepError ?? payStepBanner}
                    paymentProcessingMessage={paymentProcessingMessage}
                    isSubmitting={isSubmitting}
                    clerkEnabled={clerkEnabled}
                    signInHref={signInHref}
                    onBack={backFromPay}
                    onCreatePayPalOrder={() => createPayPalOrder(form.getValues())}
                    onCapturePayPalOrder={async (paypalOrderId) => {
                      await capturePayPalOrder(paypalOrderId)
                    }}
                    isBackNavigating={
                      isStepNavigating && stepNavigationIntent === "pay_back"
                    }
                  />
                ) : null}
              </CheckoutWizardShell>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

function mapResolutionStatusToQueryStatus(
  status: CheckoutPayNowResolution["status"]
): CheckoutPaymentUiStatus {
  switch (status) {
    case "success":
      return "success"
    case "failed":
      return "failed"
    case "reconciliation":
      return "reconciliation"
    case "processing":
    default:
      return "processing"
  }
}

function computeAncillaryPreviewTotal(
  metadata: CheckoutFormValues["ancillarySelection"]["metadata"] | null
) {
  if (!metadata) {
    return 0
  }

  const lines = [
    ...(metadata.baggage_services ?? []),
    ...(metadata.seat_services ?? []),
    ...(metadata.cancel_for_any_reason_services ?? []),
  ]

  return lines.reduce((total, line) => {
    const amount = Number(line.total_amount ?? 0)
    const quantity = Number(line.quantity ?? 0)

    if (!Number.isFinite(amount) || !Number.isFinite(quantity)) {
      return total
    }

    return total + amount * quantity
  }, 0)
}

function validateTravelerStep(input: {
  paymentMode: CheckoutFormValues["paymentMode"] | undefined
  contact: CheckoutFormValues["contact"] | undefined
  passengers: CheckoutFormValues["passengers"] | undefined
  identityDocumentsRequired: boolean
}) {
  if (!input.contact?.email?.trim() || !input.contact.phoneNumber?.trim()) {
    return false
  }

  if (!input.passengers || input.passengers.length === 0) {
    return false
  }

  for (const passenger of input.passengers) {
    if (
      !passenger.givenName.trim() ||
      !passenger.familyName.trim() ||
      !passenger.bornOn.trim()
    ) {
      return false
    }

    if (input.identityDocumentsRequired) {
      if (
        !passenger.identityNumber.trim() ||
        !passenger.identityCountryCode.trim() ||
        !passenger.identityExpiresOn.trim()
      ) {
        return false
      }
    }
  }

  return true
}

function buildRedirectPath(pathname: string | null, search: string) {
  const normalizedPathname = pathname || "/"

  if (!search) {
    return normalizedPathname
  }

  return `${normalizedPathname}?${search}`
}
