"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState, useTransition } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Show } from "@clerk/nextjs"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { ArrowRightIcon, BriefcaseIcon, PlaneTakeoffIcon } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  extractServicesFromAncillariesPayload,
  type CheckoutAncillaryPayloadMetadata,
  type CheckoutPageData,
  type CheckoutPassengerInput,
} from "@/modules/flights/checkout/domain"
import {
  getCheckoutSessionStatusAction,
  startCheckoutPaymentAction,
  submitCheckoutAction,
} from "@/modules/flights/checkout/server/actions"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import { DuffelAncillariesPanel } from "@/modules/flights/checkout/ui/duffel-ancillaries-panel"

interface CheckoutPageClientProps {
  data: CheckoutPageData
  clerkEnabled: boolean
}

interface CheckoutFormValues {
  paymentMode: "pay_now" | "hold"
  contact: {
    email: string
    phoneNumber: string
  }
  billing: {
    address: string
    city: string
    country: string
  }
  passengers: Array<{
    id: string
    type: "adult" | "child" | "infant_without_seat"
    title: "mr" | "mrs" | "ms" | "miss" | "dr"
    givenName: string
    familyName: string
    bornOn: string
    gender: "m" | "f"
    identityType: "passport" | "tax_id"
    identityNumber: string
    identityCountryCode: string
    identityExpiresOn: string
  }>
  metadata: Array<{
    key: string
    value: string
  }>
  ancillarySelection: {
    services: Array<{ id: string; quantity: number }>
    metadata: CheckoutAncillaryPayloadMetadata | null
  }
}

interface PayHereStartPaymentPayloadClient {
  sandbox: boolean
  merchant_id: string
  return_url: string
  cancel_url: string
  notify_url: string
  order_id: string
  items: string
  amount: string
  currency: "LKR"
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  custom_1?: string
  custom_2?: string
  hash: string
}

interface PayHereGlobal {
  onCompleted: (orderId: string) => void
  onDismissed: () => void
  onError: (error: unknown) => void
  startPayment: (payment: PayHereStartPaymentPayloadClient) => void
}

declare global {
  interface Window {
    payhere?: PayHereGlobal
  }
}

export function CheckoutPageClient({ data, clerkEnabled }: CheckoutPageClientProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSubmitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentProcessingMessage, setPaymentProcessingMessage] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<{
    duffelOrderId: string
    totalSellAmountLabel: string
    paymentRequiredByLabel: string | null
    paymentMode: "pay_now" | "hold"
  } | null>(null)

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
  const ancillaryPreviewTotal = useMemo(
    () => computeAncillaryPreviewTotal(ancillarySelection?.metadata ?? null),
    [ancillarySelection?.metadata]
  )
  const totalPreview = data.quote.fareSellAmount + ancillaryPreviewTotal
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(buildRedirectPath(pathname, searchParams.toString()))}`

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

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null)
    setSubmitSuccess(null)
    setPaymentProcessingMessage(null)

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
      partialOfferRequestId: data.partialOfferRequestId,
      offerId: data.state.offerId,
      quoteId: data.state.quoteId,
      selectedPartialOffers: data.state.selectedPartialOffers,
      paymentMode: values.paymentMode,
      contact: values.contact,
      billing: values.billing,
      passengers,
      metadata: values.metadata,
      ancillarySelection:
        values.ancillarySelection.services.length > 0
          ? values.ancillarySelection
          : null,
    }

    logFlightFlow("CheckoutPageClient", "submit_clicked", {
      partialOfferRequestId: data.partialOfferRequestId,
      paymentMode: values.paymentMode,
      selectedServicesCount: values.ancillarySelection.services.length,
      metadataCount: values.metadata.length,
    })

    startSubmit(() => {
      void (async () => {
        if (values.paymentMode === "pay_now") {
          if (!data.payHere.payNowEnabled) {
            setSubmitError(
              data.payHere.unavailableReason ?? "Pay now is unavailable for this fare."
            )
            return
          }

          const startResult = await startCheckoutPaymentAction(payload)

          if (!startResult.ok) {
            setSubmitError(startResult.error.message)
            return
          }

          setPaymentProcessingMessage("Opening PayHere payment window...")

          try {
            await loadPayHereSdk(data.payHere.scriptUrl)
          } catch (error) {
            setSubmitError(
              error instanceof Error
                ? error.message
                : "Could not load PayHere payment SDK."
            )
            setPaymentProcessingMessage(null)
            return
          }

          const payhere = window.payhere

          if (!payhere) {
            setSubmitError("PayHere SDK is unavailable right now. Please try again.")
            setPaymentProcessingMessage(null)
            return
          }

          payhere.onCompleted = () => {
            setPaymentProcessingMessage(
              "Payment received. Finalizing booking with airline..."
            )
            void pollCheckoutCompletion(startResult.data.checkoutSessionId)
          }
          payhere.onDismissed = () => {
            setPaymentProcessingMessage(null)
            setSubmitError("Payment window was dismissed before confirmation.")
          }
          payhere.onError = (error) => {
            setPaymentProcessingMessage(null)
            setSubmitError(
              error instanceof Error ? error.message : "Payment failed to start."
            )
          }

          payhere.startPayment(
            startResult.data.payment as PayHereStartPaymentPayloadClient
          )
          return
        }

        const result = await submitCheckoutAction(payload)

        if (!result.ok) {
          setSubmitError(result.error.message)
          return
        }

        setSubmitSuccess({
          duffelOrderId: result.data.duffelOrderId,
          totalSellAmountLabel: result.data.totalSellAmountLabel,
          paymentRequiredByLabel: result.data.paymentRequiredByLabel,
          paymentMode: result.data.paymentMode,
        })
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
        setSubmitError(result.error.message)
        setPaymentProcessingMessage(null)
        return
      }

      if (result.data.status === "completed") {
        setSubmitSuccess({
          duffelOrderId: result.data.duffelOrderId ?? "unknown",
          totalSellAmountLabel:
            result.data.totalChargeAmountLabel ?? data.quote.fareSellAmountLabel,
          paymentRequiredByLabel: null,
          paymentMode: "pay_now",
        })
        setPaymentProcessingMessage(null)
        return
      }

      if (
        result.data.status === "failed" ||
        result.data.status === "reconciliation_required"
      ) {
        setSubmitError(
          result.data.message ??
            "Payment was received but booking needs manual reconciliation."
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

          {submitSuccess ? (
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
                {submitSuccess.paymentMode === "hold" && submitSuccess.paymentRequiredByLabel ? (
                  <p>
                    Payment required by: <strong>{submitSuccess.paymentRequiredByLabel}</strong>
                  </p>
                ) : null}
                <Button className="mt-2" render={<Link href="/" />}>
                  Start new search
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight md:text-xl">Selected flights</h2>

              {data.selectedFlights.map((flight) => (
                <Card key={flight.legIndex} className="rounded-2xl border bg-card/95 py-0">
                  <CardContent className="space-y-4 px-5 pt-5 md:px-6 md:pt-6">
                    <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-start">
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-md border bg-muted/30">
                          {flight.ownerLogoSymbolUrl ? (
                            <Image
                              src={flight.ownerLogoSymbolUrl}
                              alt={`${flight.ownerName} logo`}
                              width={26}
                              height={26}
                              unoptimized
                            />
                          ) : (
                            <PlaneTakeoffIcon className="size-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {flight.legTitle}
                            {flight.dateLabel ? ` · ${flight.dateLabel}` : ""}
                          </p>
                          <p className="text-xl font-semibold md:text-lg">
                            {flight.departureTimeLabel} - {flight.arrivalTimeLabel}
                            {flight.arrivalDayOffset > 0 ? `+${flight.arrivalDayOffset}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground">{flight.ownerName}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-semibold md:text-base">{flight.durationLabel}</p>
                        <p className="text-sm text-muted-foreground">{flight.routeLabel}</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold md:text-base">{flight.stopsLabel}</p>
                        <p className="text-sm text-muted-foreground">{flight.stopsDetails}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pb-4">
                      {flight.timeline.map((event, index) => (
                        <div key={event.id} className="space-y-1">
                          <div className="grid gap-2 md:grid-cols-[360px_1fr]">
                            <p className="font-semibold">{event.dateTimeLabel}</p>
                            <p>{event.description}</p>
                          </div>
                          {event.segmentDurationLabel ? (
                            <p className="text-sm text-muted-foreground">
                              Flight duration: {event.segmentDurationLabel}
                            </p>
                          ) : null}
                          {event.meta.length > 0 ? (
                            <p className="text-sm text-muted-foreground">{event.meta.join(" · ")}</p>
                          ) : null}
                          {event.id.endsWith("-arrive") &&
                          flight.layovers.length > 0 &&
                          index / 2 < flight.layovers.length ? (
                            <p className="inline-flex rounded-full bg-muted px-3 py-1 text-sm">
                              {flight.layovers[Math.floor(index / 2)]?.label}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight md:text-xl">
                Paying now, or later?
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  disabled={!data.payHere.payNowEnabled}
                  onClick={() => form.setValue("paymentMode", "pay_now")}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left",
                    paymentMode === "pay_now"
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "bg-card",
                    !data.payHere.payNowEnabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <p className="text-lg font-semibold md:text-base">Pay now</p>
                  <p className="text-sm text-muted-foreground">
                    Pay with PayHere ({data.payHere.chargeCurrency})
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!data.paymentRequirements.canHold}
                  onClick={() => form.setValue("paymentMode", "hold")}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left",
                    paymentMode === "hold" ? "border-primary bg-primary/5" : "bg-card",
                    !data.paymentRequirements.canHold && "cursor-not-allowed opacity-60"
                  )}
                >
                  <p className="text-lg font-semibold md:text-base">Hold order</p>
                  <p className="text-sm text-muted-foreground">
                    Hold price/space and pay before the deadline
                  </p>
                </button>
              </div>
              {paymentMode === "hold" && data.paymentRequirements.paymentRequiredByLabel ? (
                <p className="text-sm text-muted-foreground">
                  Payment required by {data.paymentRequirements.paymentRequiredByLabel}
                </p>
              ) : null}
              {paymentMode === "pay_now" && !data.payHere.payNowEnabled ? (
                <p className="text-sm text-destructive">
                  {data.payHere.unavailableReason ?? "Pay now is unavailable for this fare."}
                </p>
              ) : null}
              {paymentMode === "pay_now" && data.payHere.payNowEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Charges are settled in {data.payHere.chargeCurrency}. FX includes a{" "}
                  {data.payHere.fxBufferPercent}% buffer.
                </p>
              ) : null}
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight md:text-xl">Contact details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="checkout-contact-email">Email</Label>
                  <Input
                    id="checkout-contact-email"
                    type="email"
                    placeholder="you@example.com"
                    {...form.register("contact.email")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-contact-phone">Phone number</Label>
                  <Input
                    id="checkout-contact-phone"
                    placeholder="+94771234567"
                    {...form.register("contact.phoneNumber")}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="checkout-billing-address">Billing address</Label>
                  <Input
                    id="checkout-billing-address"
                    placeholder="123 Main Street"
                    {...form.register("billing.address")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-billing-city">City</Label>
                  <Input
                    id="checkout-billing-city"
                    placeholder="Colombo"
                    {...form.register("billing.city")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-billing-country">Country</Label>
                  <Input
                    id="checkout-billing-country"
                    placeholder="Sri Lanka"
                    {...form.register("billing.country")}
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-5">
              <h2 className="text-2xl font-semibold tracking-tight md:text-xl">Passengers</h2>
              <div className="space-y-5">
                {(passengersWatch ?? []).map((passenger, index) => (
                  <Card key={passenger.id} className="rounded-2xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">
                        {data.passengerDefaults[index]?.label ?? `Passenger ${index + 1}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Select
                            value={passenger.title}
                            onValueChange={(value) => {
                              if (!value) {
                                return
                              }
                              form.setValue(
                                `passengers.${index}.title`,
                                value as CheckoutFormValues["passengers"][number]["title"]
                              )
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mr">Mr.</SelectItem>
                              <SelectItem value="mrs">Mrs.</SelectItem>
                              <SelectItem value="ms">Ms.</SelectItem>
                              <SelectItem value="miss">Miss.</SelectItem>
                              <SelectItem value="dr">Dr.</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Given name</Label>
                          <Input {...form.register(`passengers.${index}.givenName`)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Family name</Label>
                          <Input {...form.register(`passengers.${index}.familyName`)} />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Date of birth</Label>
                          <Input type="date" {...form.register(`passengers.${index}.bornOn`)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Gender</Label>
                          <Select
                            value={passenger.gender}
                            onValueChange={(value) => {
                              if (!value) {
                                return
                              }
                              form.setValue(
                                `passengers.${index}.gender`,
                                value as CheckoutFormValues["passengers"][number]["gender"]
                              )
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="m">Male</SelectItem>
                              <SelectItem value="f">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl bg-muted/40 p-4">
                        <p className="text-sm font-medium">Identity document</p>
                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                            value={passenger.identityType}
                            onValueChange={(value) => {
                              if (!value) {
                                return
                              }
                              form.setValue(
                                `passengers.${index}.identityType`,
                                value as CheckoutFormValues["passengers"][number]["identityType"]
                              )
                            }}
                          >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {data.supportedIdentityDocumentTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Document number</Label>
                            <Input {...form.register(`passengers.${index}.identityNumber`)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Issuing country</Label>
                            <Input
                              placeholder="US"
                              maxLength={2}
                              {...form.register(`passengers.${index}.identityCountryCode`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Expiry date</Label>
                            <Input
                              type="date"
                              {...form.register(`passengers.${index}.identityExpiresOn`)}
                            />
                          </div>
                        </div>
                        {data.identityDocumentsRequired ? (
                          <p className="text-sm text-muted-foreground">
                            Identity document is required for this offer.
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight md:text-xl">Add extras</h2>
              <Card className="rounded-2xl">
                <CardContent className="space-y-4 p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <BriefcaseIcon className="mt-0.5 size-5" />
                    <div className="space-y-1">
                      <p className="font-medium">Extra baggage and seat selection</p>
                      <p className="text-sm text-muted-foreground">
                        Choose ancillaries with Duffel Components
                      </p>
                    </div>
                  </div>
                  <DuffelAncillariesPanel
                    offer={data.ancillary.offer}
                    seatMaps={data.ancillary.seatMaps}
                    passengers={buildAncillaryPassengers(form.getValues())}
                    disabled={paymentMode === "hold"}
                    onSelectionChange={(selection) => {
                      const services = extractServicesFromAncillariesPayload({
                        services: selection.services,
                      })
                      form.setValue("ancillarySelection", {
                        services,
                        metadata: selection.metadata,
                      })
                    }}
                  />
                </CardContent>
              </Card>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight md:text-xl">Add metadata</h2>
              <div className="space-y-3">
                {metadataFieldArray.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 md:grid-cols-2">
                    <Input placeholder="Key" {...form.register(`metadata.${index}.key`)} />
                    <Input placeholder="Value" {...form.register(`metadata.${index}.value`)} />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() => metadataFieldArray.append({ key: "", value: "" })}
                >
                  Add another key/value pair
                </button>
              </div>
            </section>

            <Separator />

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
                        ? data.payHere.estimatedFareAmountLkrLabel ??
                          `${data.payHere.chargeCurrency} --`
                        : formatPreviewCurrency(totalPreview, data.quote.currency)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {paymentMode === "pay_now"
                      ? "Final PayHere charge is recalculated server-side from latest fare and selected extras."
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

              <Button type="submit" className="h-12 w-full rounded-xl text-sm md:text-base" disabled={isSubmitting}>
                {isSubmitting
                  ? "Confirming..."
                  : paymentMode === "hold"
                    ? "Confirm and hold"
                    : "Pay with PayHere"}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </section>
          </form>
        </div>
      </div>
    </main>
  )
}

function buildAncillaryPassengers(values: CheckoutFormValues) {
  return values.passengers.map((passenger) => ({
    id: passenger.id,
    title: passenger.title,
    given_name: passenger.givenName || "Passenger",
    family_name: passenger.familyName || "Name",
    gender: passenger.gender,
    born_on: passenger.bornOn || "1990-01-01",
    email: values.contact.email || "traveler@example.com",
    phone_number: values.contact.phoneNumber || "+10000000000",
  }))
}

function computeAncillaryPreviewTotal(metadata: CheckoutAncillaryPayloadMetadata | null) {
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

async function loadPayHereSdk(scriptUrl: string) {
  if (typeof window === "undefined") {
    throw new Error("PayHere SDK can only load in browser.")
  }

  if (window.payhere) {
    return
  }

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-payhere-sdk="true"]'
  )

  if (existing) {
    await waitForScriptLoad(existing)
    return
  }

  const script = document.createElement("script")
  script.src = scriptUrl
  script.async = true
  script.setAttribute("data-payhere-sdk", "true")
  document.head.appendChild(script)
  await waitForScriptLoad(script)
}

function waitForScriptLoad(script: HTMLScriptElement) {
  if ((script as HTMLScriptElement & { dataset: { loaded?: string } }).dataset.loaded === "true") {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      script.dataset.loaded = "true"
      script.removeEventListener("load", onLoad)
      script.removeEventListener("error", onError)
      resolve()
    }

    const onError = () => {
      script.removeEventListener("load", onLoad)
      script.removeEventListener("error", onError)
      reject(new Error("Failed to load PayHere SDK script."))
    }

    script.addEventListener("load", onLoad)
    script.addEventListener("error", onError)
  })
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function buildRedirectPath(pathname: string | null, search: string) {
  const normalizedPathname = pathname || "/"

  if (!search) {
    return normalizedPathname
  }

  return `${normalizedPathname}?${search}`
}
