"use client"

import Image from "next/image"
import { AlertCircleIcon, BriefcaseIcon, CheckCircle2Icon, PlaneTakeoffIcon } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { CheckoutPageData } from "@/modules/flights/checkout/domain"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"

interface CheckoutTravelerStepProps {
  data: CheckoutPageData
  form: UseFormReturn<CheckoutFormValues>
  paymentMode: CheckoutFormValues["paymentMode"] | undefined
  passengers: CheckoutFormValues["passengers"] | undefined
  ancillaryServicesCount: number
  stepError: string | null
  onContinue: () => void
  disabled?: boolean
  isNavigating?: boolean
}

export function CheckoutTravelerStep({
  data,
  form,
  paymentMode,
  passengers,
  ancillaryServicesCount,
  stepError,
  onContinue,
  disabled = false,
  isNavigating = false,
}: CheckoutTravelerStepProps) {
  const errors = form.formState.errors

  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <StepIntro
          eyebrow="Itinerary"
          title="Review selected flights"
          description="Check flight times before entering traveler details."
        />

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
        <StepIntro
          eyebrow="Payment choice"
          title="Choose how to secure this booking"
          description="Pay now confirms with the airline after PayPal capture. Hold keeps the order open until the airline payment deadline."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            disabled={!data.payment.payNowEnabled}
            onClick={() => form.setValue("paymentMode", "pay_now")}
            className={cn(
              "rounded-2xl border px-4 py-4 text-left",
              paymentMode === "pay_now" ? "border-[#1f6f54] bg-[#eef8f3]" : "bg-card",
              !data.payment.payNowEnabled && "cursor-not-allowed opacity-60"
            )}
          >
            <p className="text-lg font-semibold md:text-base">Pay now</p>
            <p className="text-sm text-muted-foreground">
              Pay with PayPal ({data.payment.chargeCurrency})
            </p>
          </button>
          <button
            type="button"
            disabled={!data.paymentRequirements.canHold}
            onClick={() => form.setValue("paymentMode", "hold")}
            className={cn(
              "rounded-2xl border px-4 py-4 text-left",
              paymentMode === "hold" ? "border-[#17201d] bg-[#f2f3ee]" : "bg-card",
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
        {paymentMode === "pay_now" && !data.payment.payNowEnabled ? (
          <p className="text-sm text-destructive">
            {data.payment.unavailableReason ?? "Pay now is unavailable for this fare."}
          </p>
        ) : null}
        {paymentMode === "pay_now" && data.payment.payNowEnabled ? (
          <p className="text-sm text-muted-foreground">
            You will complete payment securely with PayPal on the pay step.
          </p>
        ) : null}
      </section>

      <Separator />

      <section className="space-y-4">
        <StepIntro
          eyebrow="Contact"
          title="Where should we send booking updates?"
          description="Use the traveler email and an international phone number."
        />
        {hasContactErrors(errors) ? (
          <ValidationNotice message="Fix the contact details before continuing." />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={Boolean(errors.contact?.email)}>
            <FieldLabel htmlFor="checkout-contact-email">Email <RequiredMark /></FieldLabel>
            <Input
              id="checkout-contact-email"
              type="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.contact?.email)}
              {...form.register("contact.email")}
            />
            <FieldError errors={[errors.contact?.email]} />
          </Field>
          <Field data-invalid={Boolean(errors.contact?.phoneNumber)}>
            <FieldLabel htmlFor="checkout-contact-phone">Phone number <RequiredMark /></FieldLabel>
            <Input
              id="checkout-contact-phone"
              placeholder="+94771234567"
              aria-invalid={Boolean(errors.contact?.phoneNumber)}
              {...form.register("contact.phoneNumber")}
            />
            <FieldDescription>Use international format, for example +94771234567.</FieldDescription>
            <FieldError errors={[errors.contact?.phoneNumber]} />
          </Field>
        </div>
      </section>

      <Separator />

      <section className="space-y-5">
        <StepIntro
          eyebrow="Travelers"
          title="Enter traveler details exactly as shown on documents"
          description="Names and document details must match the airline requirements for this fare."
        />
        <div className="space-y-5">
          {(passengers ?? []).map((passenger, index) => (
            <Card key={passenger.id} className="rounded-lg border-[#d7d8ce]">
              <CardHeader className="border-b border-[#eceee8] pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">
                    {data.passengerDefaults[index]?.label ?? `Passenger ${index + 1}`}
                  </CardTitle>
                  <PassengerStateBadge
                    complete={isPassengerComplete({
                      passenger,
                      identityDocumentsRequired: data.identityDocumentsRequired,
                    })}
                    invalid={Boolean(errors.passengers?.[index])}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field>
                    <FieldLabel>Title <RequiredMark /></FieldLabel>
                    <Select
                      value={passenger.title}
                      onValueChange={(value) => {
                        if (!value) {
                          return
                        }
                        form.setValue(
                          `passengers.${index}.title`,
                          value as CheckoutFormValues["passengers"][number]["title"],
                          { shouldDirty: true, shouldValidate: true }
                        )
                      }}
                    >
                      <SelectTrigger aria-invalid={Boolean(errors.passengers?.[index]?.title)}>
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
                    <FieldError errors={[errors.passengers?.[index]?.title]} />
                  </Field>
                  <Field data-invalid={Boolean(errors.passengers?.[index]?.givenName)}>
                    <FieldLabel>Given name <RequiredMark /></FieldLabel>
                    <Input
                      aria-invalid={Boolean(errors.passengers?.[index]?.givenName)}
                      autoComplete="given-name"
                      {...form.register(`passengers.${index}.givenName`)}
                    />
                    <FieldError errors={[errors.passengers?.[index]?.givenName]} />
                  </Field>
                  <Field data-invalid={Boolean(errors.passengers?.[index]?.familyName)}>
                    <FieldLabel>Family name <RequiredMark /></FieldLabel>
                    <Input
                      aria-invalid={Boolean(errors.passengers?.[index]?.familyName)}
                      autoComplete="family-name"
                      {...form.register(`passengers.${index}.familyName`)}
                    />
                    <FieldError errors={[errors.passengers?.[index]?.familyName]} />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field data-invalid={Boolean(errors.passengers?.[index]?.bornOn)}>
                    <FieldLabel>Date of birth <RequiredMark /></FieldLabel>
                    <Input
                      type="date"
                      aria-invalid={Boolean(errors.passengers?.[index]?.bornOn)}
                      {...form.register(`passengers.${index}.bornOn`)}
                    />
                    <FieldError errors={[errors.passengers?.[index]?.bornOn]} />
                  </Field>
                  <Field>
                    <FieldLabel>Gender <RequiredMark /></FieldLabel>
                    <Select
                      value={passenger.gender}
                      onValueChange={(value) => {
                        if (!value) {
                          return
                        }
                        form.setValue(
                          `passengers.${index}.gender`,
                          value as CheckoutFormValues["passengers"][number]["gender"],
                          { shouldDirty: true, shouldValidate: true }
                        )
                      }}
                    >
                      <SelectTrigger aria-invalid={Boolean(errors.passengers?.[index]?.gender)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">Male</SelectItem>
                        <SelectItem value="f">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError errors={[errors.passengers?.[index]?.gender]} />
                  </Field>
                </div>

                <div className="space-y-3 rounded-lg border border-[#e2e4dc] bg-[#f8f9f5] p-4">
                  <p className="text-sm font-medium">Identity document</p>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field>
                      <FieldLabel>
                        Type {data.identityDocumentsRequired ? <RequiredMark /> : null}
                      </FieldLabel>
                      <Select
                        value={passenger.identityType}
                        onValueChange={(value) => {
                          if (!value) {
                            return
                          }
                          form.setValue(
                            `passengers.${index}.identityType`,
                            value as CheckoutFormValues["passengers"][number]["identityType"],
                            { shouldDirty: true, shouldValidate: true }
                          )
                        }}
                      >
                        <SelectTrigger aria-invalid={Boolean(errors.passengers?.[index]?.identityType)}>
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
                      <FieldError errors={[errors.passengers?.[index]?.identityType]} />
                    </Field>
                    <Field data-invalid={Boolean(errors.passengers?.[index]?.identityNumber)}>
                      <FieldLabel>
                        Document number {data.identityDocumentsRequired ? <RequiredMark /> : null}
                      </FieldLabel>
                      <Input
                        aria-invalid={Boolean(errors.passengers?.[index]?.identityNumber)}
                        {...form.register(`passengers.${index}.identityNumber`)}
                      />
                      <FieldError errors={[errors.passengers?.[index]?.identityNumber]} />
                    </Field>
                    <Field data-invalid={Boolean(errors.passengers?.[index]?.identityCountryCode)}>
                      <FieldLabel>
                        Issuing country {data.identityDocumentsRequired ? <RequiredMark /> : null}
                      </FieldLabel>
                      <Input
                        placeholder="US"
                        maxLength={2}
                        aria-invalid={Boolean(errors.passengers?.[index]?.identityCountryCode)}
                        {...form.register(`passengers.${index}.identityCountryCode`, {
                          setValueAs: (value) =>
                            typeof value === "string" ? value.trim().toUpperCase() : value,
                        })}
                      />
                      <FieldDescription>Use the 2-letter country code.</FieldDescription>
                      <FieldError errors={[errors.passengers?.[index]?.identityCountryCode]} />
                    </Field>
                    <Field data-invalid={Boolean(errors.passengers?.[index]?.identityExpiresOn)}>
                      <FieldLabel>
                        Expiry date {data.identityDocumentsRequired ? <RequiredMark /> : null}
                      </FieldLabel>
                      <Input
                        type="date"
                        aria-invalid={Boolean(errors.passengers?.[index]?.identityExpiresOn)}
                        {...form.register(`passengers.${index}.identityExpiresOn`)}
                      />
                      <FieldError errors={[errors.passengers?.[index]?.identityExpiresOn]} />
                    </Field>
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

      <div className="rounded-2xl border bg-card/80 p-4">
        <div className="flex items-start gap-3">
          <BriefcaseIcon className="mt-0.5 size-5" />
          <div className="space-y-1">
            <p className="font-medium">Extras are next</p>
            <p className="text-sm text-muted-foreground">
              You can add seat and baggage extras in the next step.
            </p>
            {paymentMode === "hold" && ancillaryServicesCount > 0 ? (
              <p className="text-sm text-muted-foreground">
                Hold mode clears selected extras automatically.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {stepError ? <p className="text-sm text-destructive">{stepError}</p> : null}

      <div className="flex justify-end">
        <Button type="button" className="h-11 rounded-xl px-6" onClick={onContinue} disabled={disabled}>
          {isNavigating ? (
            <Spinner data-icon="inline-start" size="sm" />
          ) : null}
          Continue to extras
        </Button>
      </div>
    </div>
  )
}

function StepIntro(input: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-[#6c746f]">{input.eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight md:text-xl">{input.title}</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">{input.description}</p>
    </div>
  )
}

function RequiredMark() {
  return <span className="text-destructive">*</span>
}

function ValidationNotice(input: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircleIcon className="mt-0.5 size-4" />
      <p>{input.message}</p>
    </div>
  )
}

function PassengerStateBadge(input: { complete: boolean; invalid: boolean }) {
  if (input.invalid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
        <AlertCircleIcon className="size-3.5" />
        Needs attention
      </span>
    )
  }

  if (input.complete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2Icon className="size-3.5" />
        Complete
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      In progress
    </span>
  )
}

function hasContactErrors(
  errors: UseFormReturn<CheckoutFormValues>["formState"]["errors"]
) {
  return Boolean(errors.contact?.email || errors.contact?.phoneNumber)
}

function isPassengerComplete(input: {
  passenger: CheckoutFormValues["passengers"][number]
  identityDocumentsRequired: boolean
}) {
  if (
    !input.passenger.givenName.trim() ||
    !input.passenger.familyName.trim() ||
    !input.passenger.bornOn.trim()
  ) {
    return false
  }

  if (!input.identityDocumentsRequired) {
    return true
  }

  return Boolean(
    input.passenger.identityNumber.trim() &&
      input.passenger.identityCountryCode.trim() &&
      input.passenger.identityExpiresOn.trim()
  )
}
