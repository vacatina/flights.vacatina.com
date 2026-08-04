"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Clock3Icon,
  RefreshCcwIcon,
  ShieldCheckIcon,
} from "lucide-react"

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
import {
  createCheckoutFormSchema,
  type CheckoutFormValues,
} from "@/modules/flights/checkout/ui/checkout-form-values"
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
import { cn } from "@/lib/utils"
import { DecimalMoney, FxEstimateDisclosure, Money } from "@/modules/currency/ui"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const E164_PHONE_PATTERN = /^\+[1-9]\d{6,14}$/
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/
const QUOTE_EXPIRY_WARNING_MS = 5 * 60 * 1000

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
    resolver: zodResolver(
      createCheckoutFormSchema({
        identityDocumentsRequired: data.identityDocumentsRequired,
      })
    ),
    mode: "onBlur",
    reValidateMode: "onChange",
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
  const quoteCountdown = useQuoteCountdown(data.quote.expiresAtIso)
  const quoteExpired = quoteCountdown.remainingMs <= 0
  const quoteExpiringSoon =
    quoteCountdown.remainingMs > 0 &&
    quoteCountdown.remainingMs <= QUOTE_EXPIRY_WARNING_MS
  const reviewHref = `/results/${data.partialOfferRequestId}/review`
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
  const reviewReady =
    travelerStepReady &&
    !quoteExpired &&
    !isSubmitting &&
    !isStepNavigating &&
    !statusModeActive

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

  async function validateTravelerForNavigation() {
    if (quoteExpired) {
      setStepError("This fare has expired. Return to review to refresh pricing.")
      return false
    }

    const valid = await form.trigger(["contact", "passengers"], {
      shouldFocus: true,
    })

    if (!valid) {
      setStepError("Fix the highlighted traveler details before continuing.")
      return false
    }

    setStepError(null)
    return true
  }

  async function navigateStep(step: CheckoutWizardStep) {
    if (!canNavigateToStep(step)) {
      await validateTravelerForNavigation()
      return
    }

    if (step !== "traveler") {
      const valid = await validateTravelerForNavigation()
      if (!valid) {
        return
      }
    }

    setStepError(null)
    setStepNavigationIntent("wizard_step")
    startStepNavigation(() => {
      stepRouting.navigateStep(step)
    })
  }

  async function continueFromTraveler() {
    const valid = await validateTravelerForNavigation()

    if (!valid) {
      return
    }

    setStepError(null)
    setStepNavigationIntent("traveler_continue")
    startStepNavigation(() => {
      stepRouting.goNextStep()
    })
  }

  function continueFromExtras() {
    if (quoteExpired) {
      setStepError("This fare has expired. Return to review to refresh pricing.")
      return
    }

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

  function handleCheckoutSubmit(values: CheckoutFormValues) {
    if (quoteExpired) {
      setSubmitError("This fare has expired. Return to review to refresh pricing.")
      return
    }

    onSubmit(values)
  }

  function onPayPalCancel() {
    setSubmitError("PayPal checkout was cancelled before payment confirmation.")
    logFlightFlow("CheckoutPageClient", "paypal_checkout_cancelled", {
      partialOfferRequestId: data.partialOfferRequestId,
      quoteId: data.state.quoteId,
    })
  }

  function onPayPalError(error: unknown) {
    setSubmitError("PayPal could not process this payment. Try PayPal login or refresh pricing.")
    logFlightFlow("CheckoutPageClient", "paypal_checkout_error", {
      partialOfferRequestId: data.partialOfferRequestId,
      quoteId: data.state.quoteId,
      errorMessage: error instanceof Error ? error.message : String(error),
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
    <main className="min-h-svh bg-background py-5 text-foreground md:py-8">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="space-y-5">
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

          <div className="border-y border-border py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Secure flight checkout
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                  {data.tripSummary.routeLabel}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.tripSummary.dateRangeLabel} · {data.tripSummary.passengersLabel} ·{" "}
                  {data.tripSummary.cabinLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-md border border-border bg-card px-3 py-1">
                  {data.tripSummary.journeyTypeLabel}
                </span>
                <span className="rounded-md border border-border bg-card px-3 py-1">
                  {paymentMode === "hold" ? "Hold booking" : "Pay now"}
                </span>
              </div>
            </div>
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
                  Total charged:{" "}
                  <strong>
                    {submitSuccess.totalSellMoney ? (
                      <Money
                        money={submitSuccess.totalSellMoney}
                        fallbackLabel={submitSuccess.totalSellAmountLabel}
                      />
                    ) : (
                      submitSuccess.totalSellAmountLabel
                    )}
                  </strong>
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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="min-w-0">
              {statusModeActive && effectiveStatus ? (
                <CheckoutPaymentStatusView
                  status={effectiveStatus}
                  sessionId={currentSessionId}
                  resolution={payNowResolution}
                  errorMessage={submitError}
                  onRetryPay={onRetryPayStep}
                />
              ) : (
                <form onSubmit={form.handleSubmit(handleCheckoutSubmit)} className="space-y-6">
                  {quoteExpired ? (
                    <ExpiredFareRecovery
                      reviewHref={reviewHref}
                      quoteExpiresAtLabel={data.quote.expiresAtLabel}
                    />
                  ) : quoteExpiringSoon ? (
                    <FareExpiryNotice
                      remainingLabel={quoteCountdown.label}
                      quoteExpiresAtLabel={data.quote.expiresAtLabel}
                    />
                  ) : null}
                  <CheckoutWizardShell
                    currentStep={effectiveStep}
                    onStepChange={(step) => {
                      void navigateStep(step)
                    }}
                    canNavigateToStep={canNavigateToStep}
                    travelerComplete={travelerStepReady}
                    extrasComplete={(ancillarySelection?.services.length ?? 0) > 0}
                  >
                    {effectiveStep === "traveler" ? (
                      <CheckoutTravelerStep
                        data={data}
                        form={form}
                        paymentMode={paymentMode}
                        passengers={passengersWatch}
                        ancillaryServicesCount={ancillarySelection?.services.length ?? 0}
                        stepError={stepError}
                        onContinue={() => {
                          void continueFromTraveler()
                        }}
                        disabled={isSubmitting || isStepNavigating || quoteExpired}
                        isNavigating={
                          isStepNavigating && stepNavigationIntent === "traveler_continue"
                        }
                      />
                    ) : null}

                    {effectiveStep === "extras" ? (
                      <CheckoutExtrasStep
                        data={data}
                        form={form}
                        paymentMode={paymentMode}
                        onBack={backFromExtras}
                        onContinue={continueFromExtras}
                        disabled={isSubmitting || isStepNavigating || quoteExpired}
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
                        onPayPalCancel={onPayPalCancel}
                        onPayPalError={onPayPalError}
                        paymentReady={reviewReady}
                        quoteExpired={quoteExpired}
                        reviewHref={reviewHref}
                        onCreatePayPalOrder={async () => {
                          const valid = await validateTravelerForNavigation()
                          if (!valid) {
                            throw new Error("Fix traveler details before payment.")
                          }
                          return createPayPalOrder(form.getValues())
                        }}
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
            <CheckoutSummaryRail
              data={data}
              paymentMode={paymentMode}
              ancillaryPreviewTotal={ancillaryPreviewTotal}
              totalPreview={totalPreview}
              travelerComplete={travelerStepReady}
              reviewReady={reviewReady}
              quoteExpired={quoteExpired}
              quoteExpiringSoon={quoteExpiringSoon}
              quoteCountdownLabel={quoteCountdown.label}
            />
          </div>
        </div>
      </div>
      <CheckoutMobileSummary
        data={data}
        paymentMode={paymentMode}
        totalPreview={totalPreview}
        quoteExpired={quoteExpired}
        quoteExpiringSoon={quoteExpiringSoon}
        quoteCountdownLabel={quoteCountdown.label}
      />
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

function ExpiredFareRecovery(input: {
  reviewHref: string
  quoteExpiresAtLabel: string
}) {
  return (
    <Card className="rounded-xl border-border">
      <CardContent className="flex flex-col gap-5 px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20">
            <AlertCircleIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Fare expired</p>
            <h2 className="text-xl font-semibold tracking-tight">
              Quote no longer valid
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              This quote expired at {input.quoteExpiresAtLabel}. Airline prices and availability frequently change, so you will need to start a new search.
            </p>
          </div>
        </div>
        {/* The refresh button is commented out/removed because expired PartialOfferRequests cannot be refreshed.
            We route the user back to the homepage to start a new search instead. */}
        <Button className="h-10 shrink-0 px-4" render={<a href="/" />}>
          <RefreshCcwIcon data-icon="inline-start" />
          Start new search
        </Button>
      </CardContent>
    </Card>
  )
}

function FareExpiryNotice(input: {
  remainingLabel: string
  quoteExpiresAtLabel: string
}) {
  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <Clock3Icon className="mt-0.5 size-4" />
        <p>
          Fare expires in <strong>{input.remainingLabel}</strong>. Complete payment before{" "}
          {input.quoteExpiresAtLabel}, or refresh pricing from review.
        </p>
      </div>
    </section>
  )
}

function CheckoutSummaryRail(input: {
  data: CheckoutPageData
  paymentMode: CheckoutFormValues["paymentMode"] | undefined
  ancillaryPreviewTotal: number
  totalPreview: number
  travelerComplete: boolean
  reviewReady: boolean
  quoteExpired: boolean
  quoteExpiringSoon: boolean
  quoteCountdownLabel: string
}) {
  const paymentLabel = input.paymentMode === "hold" ? "Hold order" : "Pay now"

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Trip summary</p>
          <h2 className="text-lg font-semibold">{input.data.tripSummary.routeLabel}</h2>
          <p className="text-sm text-muted-foreground">{input.data.tripSummary.dateRangeLabel}</p>
        </div>

        <div className="space-y-3 border-y border-border py-4">
          {input.data.selectedFlights.slice(0, 3).map((flight) => (
            <div key={flight.legIndex} className="grid grid-cols-[72px_1fr] gap-3 text-sm">
              <span className="font-medium text-muted-foreground">{flight.legTitle}</span>
              <span>
                {flight.routeLabel} · {flight.departureTimeLabel}
              </span>
            </div>
          ))}
          {input.data.selectedFlights.length > 3 ? (
            <p className="text-sm text-muted-foreground">
              +{input.data.selectedFlights.length - 3} more legs
            </p>
          ) : null}
        </div>

        <div className="space-y-2 text-sm">
          <SummaryLine
            label="Fare"
            value={
              <Money
                money={input.data.quote.fareSellMoney}
                fallbackLabel={input.data.quote.fareSellAmountLabel}
              />
            }
          />
          <SummaryLine
            label="Extras"
            value={
              <DecimalMoney
                value={input.ancillaryPreviewTotal}
                currency={input.data.quote.currency}
              />
            }
          />
          <div className="my-3 h-px bg-border" />
          <SummaryLine
            label="Total"
            value={
              <DecimalMoney
                value={input.totalPreview}
                currency={
                  input.paymentMode === "pay_now"
                    ? input.data.payment.chargeCurrency
                    : input.data.quote.currency
                }
              />
            }
            strong
          />
          <FxEstimateDisclosure
            sourceCurrencies={[input.data.quote.currency]}
          />
        </div>

        <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
          <StatusRow
            complete={input.travelerComplete}
            label={input.travelerComplete ? "Traveler details complete" : "Traveler details needed"}
          />
          <StatusRow
            complete={!input.quoteExpired && (input.reviewReady || input.paymentMode === "hold")}
            label={
              input.quoteExpired
                ? "Refresh fare before payment"
                : input.paymentMode === "hold"
                  ? "Hold booking selected"
                  : "Ready for PayPal"
            }
          />
          <div className="flex items-center gap-2 pt-1 text-muted-foreground">
            <ShieldCheckIcon className="size-4" />
            <span>{paymentLabel} · secured checkout</span>
          </div>
        </div>

        <div
          className={cn(
            "flex gap-2 rounded-md border p-3 text-sm",
            input.quoteExpired
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : input.quoteExpiringSoon
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-border text-muted-foreground"
          )}
        >
          <Clock3Icon className="mt-0.5 size-4" />
          <span>
            {input.quoteExpired
              ? "Fare expired"
              : `Fare hold ${input.quoteCountdownLabel}`}
          </span>
        </div>

        {input.data.tripSummary.offerExpiresAtLabel ? (
          <div className="flex gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
            <Clock3Icon className="mt-0.5 size-4" />
            <span>Offer expires {input.data.tripSummary.offerExpiresAtLabel}</span>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function CheckoutMobileSummary(input: {
  data: CheckoutPageData
  paymentMode: CheckoutFormValues["paymentMode"] | undefined
  totalPreview: number
  quoteExpired: boolean
  quoteExpiringSoon: boolean
  quoteCountdownLabel: string
}) {
  const currency =
    input.paymentMode === "pay_now"
      ? input.data.payment.chargeCurrency
      : input.data.quote.currency

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden",
        input.quoteExpired
          ? "border-destructive/30"
          : input.quoteExpiringSoon
            ? "border-amber-300"
            : ""
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Total due</p>
          <p className="text-base font-semibold">
            <DecimalMoney value={input.totalPreview} currency={currency} />
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{input.paymentMode === "hold" ? "Hold order" : "Pay now"}</p>
          <p>
            {input.quoteExpired
              ? "Fare expired"
              : `Fare hold ${input.quoteCountdownLabel}`}
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryLine(input: {
  label: string
  value: ReactNode
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        input.strong ? "text-base font-semibold" : "text-sm"
      )}
    >
      <span className="text-[#66706b]">{input.label}</span>
      <span>{input.value}</span>
    </div>
  )
}

function StatusRow(input: { complete: boolean; label: string }) {
  const Icon = input.complete ? CheckCircle2Icon : AlertCircleIcon

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        input.complete ? "text-emerald-700" : "text-amber-700"
      )}
    >
      <Icon className="size-4" />
      <span>{input.label}</span>
    </div>
  )
}

function useQuoteCountdown(expiresAtIso: string) {
  const expiresAtMs = useMemo(() => {
    const parsed = Date.parse(expiresAtIso)
    return Number.isFinite(parsed) ? parsed : 0
  }, [expiresAtIso])
  const [remainingMs, setRemainingMs] = useState(Number.POSITIVE_INFINITY)

  useEffect(() => {
    function updateRemaining() {
      setRemainingMs(Math.max(0, expiresAtMs - Date.now()))
    }

    updateRemaining()

    const intervalId = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(intervalId)
  }, [expiresAtMs])

  return {
    remainingMs,
    label: formatDurationLabel(remainingMs),
  }
}

function formatDurationLabel(ms: number) {
  if (ms <= 0) {
    return "expired"
  }

  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
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
  const email = input.contact?.email?.trim() ?? ""
  const phoneNumber = input.contact?.phoneNumber?.trim() ?? ""

  if (!EMAIL_PATTERN.test(email) || !E164_PHONE_PATTERN.test(phoneNumber)) {
    return false
  }

  if (!input.passengers || input.passengers.length === 0) {
    return false
  }

  for (const passenger of input.passengers) {
    if (!passenger.givenName.trim() || !passenger.familyName.trim()) {
      return false
    }

    if (!isIsoDate(passenger.bornOn)) {
      return false
    }

    if (input.identityDocumentsRequired) {
      if (
        !passenger.identityNumber.trim() ||
        !COUNTRY_CODE_PATTERN.test(passenger.identityCountryCode.trim()) ||
        !isIsoDate(passenger.identityExpiresOn)
      ) {
        return false
      }
    }
  }

  return true
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function buildRedirectPath(pathname: string | null, search: string) {
  const normalizedPathname = pathname || "/"

  if (!search) {
    return normalizedPathname
  }

  return `${normalizedPathname}?${search}`
}
