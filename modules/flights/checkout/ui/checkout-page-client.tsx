"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
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
  type CheckoutPageData,
  type CheckoutWizardStep,
} from "@/modules/flights/checkout/domain"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"
import { useCheckoutDraftPersistence } from "@/modules/flights/checkout/ui/hooks/use-checkout-draft-persistence"
import { useCheckoutFlow } from "@/modules/flights/checkout/ui/hooks/use-checkout-flow"
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
  const [stepError, setStepError] = useState<string | null>(null)
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(buildRedirectPath(pathname, searchParams.toString()))}`

  const form = useForm<CheckoutFormValues>({
    defaultValues: {
      paymentMode:
        data.payHere.payNowEnabled || !data.paymentRequirements.canHold
          ? "pay_now"
          : "hold",
      contact: {
        email: "",
        phoneNumber: "",
      },
      billing: {
        address: "",
        city: "",
        country: "Sri Lanka",
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
  const billingWatch = useWatch({
    control: form.control,
    name: "billing",
  })

  const checkoutFlow = useCheckoutFlow({
    data,
  })
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
    enabled: !checkoutFlow.submitSuccess,
  })

  const ancillaryPreviewTotal = useMemo(
    () => computeAncillaryPreviewTotal(ancillarySelection?.metadata ?? null),
    [ancillarySelection?.metadata]
  )
  const totalPreview = data.quote.fareSellAmount + ancillaryPreviewTotal

  const travelerStepReady = useMemo(
    () =>
      validateTravelerStep({
        paymentMode,
        contact: contactWatch,
        billing: billingWatch,
        passengers: passengersWatch,
        identityDocumentsRequired: data.identityDocumentsRequired,
      }),
    [
      billingWatch,
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
    if (!checkoutFlow.submitSuccess) {
      return
    }

    clearDraft()
  }, [checkoutFlow.submitSuccess, clearDraft])

  useEffect(() => {
    logFlightFlow("CheckoutPageClient", "hydrated", {
      partialOfferRequestId: data.partialOfferRequestId,
      step: stepRouting.currentStep,
      selectedCount: data.state.selectedPartialOffers.length,
      payNowEnabled: data.payHere.payNowEnabled,
    })
  }, [
    data.partialOfferRequestId,
    data.payHere.payNowEnabled,
    data.state.selectedPartialOffers.length,
    stepRouting.currentStep,
  ])

  function canNavigateToStep(step: CheckoutWizardStep) {
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
    stepRouting.navigateStep(step)
  }

  function continueFromTraveler() {
    if (!travelerStepReady) {
      setStepError("Complete required traveler details before continuing.")
      return
    }

    stepRouting.goNextStep()
  }

  function continueFromExtras() {
    stepRouting.goNextStep()
  }

  return (
    <main className="min-h-svh bg-muted/40 py-6 md:py-10">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-8">
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>Orders</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>New order</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink>Checkout</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Confirm</BreadcrumbPage>
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
            <h1 className="text-3xl font-semibold tracking-tight md:text-2xl">
              {data.tripSummary.routeLabel}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.tripSummary.offerExpiresAtLabel
                ? `This offer will expire on ${data.tripSummary.offerExpiresAtLabel}`
                : "Offer expiry time unavailable"}
            </p>
          </div>

          {checkoutFlow.submitSuccess ? (
            <Card className="rounded-2xl border-emerald-500/40 bg-emerald-50/30">
              <CardHeader>
                <CardTitle className="text-xl">Order created successfully</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Duffel order ID: <strong>{checkoutFlow.submitSuccess.duffelOrderId}</strong>
                </p>
                <p>
                  Total charged: <strong>{checkoutFlow.submitSuccess.totalSellAmountLabel}</strong>
                </p>
                {checkoutFlow.submitSuccess.paymentMode === "hold" &&
                checkoutFlow.submitSuccess.paymentRequiredByLabel ? (
                  <p>
                    Payment required by:{" "}
                    <strong>{checkoutFlow.submitSuccess.paymentRequiredByLabel}</strong>
                  </p>
                ) : null}
                <Button className="mt-2" render={<Link href="/" />}>
                  Start new search
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <form onSubmit={form.handleSubmit(checkoutFlow.onSubmit)} className="space-y-6">
            <CheckoutWizardShell
              currentStep={stepRouting.currentStep}
              onStepChange={navigateStep}
              canNavigateToStep={canNavigateToStep}
            >
              {stepRouting.currentStep === "traveler" ? (
                <CheckoutTravelerStep
                  data={data}
                  form={form}
                  paymentMode={paymentMode}
                  passengers={passengersWatch}
                  ancillaryServicesCount={ancillarySelection?.services.length ?? 0}
                  stepError={stepRouting.currentStep === "traveler" ? stepError : null}
                  onContinue={continueFromTraveler}
                  disabled={checkoutFlow.isSubmitting}
                />
              ) : null}

              {stepRouting.currentStep === "extras" ? (
                <CheckoutExtrasStep
                  data={data}
                  form={form}
                  metadataFieldArray={metadataFieldArray}
                  paymentMode={paymentMode}
                  onBack={stepRouting.goPreviousStep}
                  onContinue={continueFromExtras}
                  disabled={checkoutFlow.isSubmitting}
                />
              ) : null}

              {stepRouting.currentStep === "pay" ? (
                <CheckoutPayStep
                  data={data}
                  paymentMode={paymentMode}
                  ancillaryPreviewTotal={ancillaryPreviewTotal}
                  totalPreview={totalPreview}
                  submitError={checkoutFlow.submitError}
                  paymentProcessingMessage={checkoutFlow.paymentProcessingMessage}
                  isSubmitting={checkoutFlow.isSubmitting}
                  clerkEnabled={clerkEnabled}
                  signInHref={signInHref}
                  onBack={stepRouting.goPreviousStep}
                />
              ) : null}
            </CheckoutWizardShell>
          </form>
        </div>
      </div>
    </main>
  )
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
  billing: CheckoutFormValues["billing"] | undefined
  passengers: CheckoutFormValues["passengers"] | undefined
  identityDocumentsRequired: boolean
}) {
  if (!input.contact?.email?.trim() || !input.contact.phoneNumber?.trim()) {
    return false
  }

  if (input.paymentMode === "pay_now") {
    if (
      !input.billing?.address?.trim() ||
      !input.billing.city?.trim() ||
      !input.billing.country?.trim()
    ) {
      return false
    }
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
