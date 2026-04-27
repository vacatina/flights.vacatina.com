"use client"

import Image from "next/image"
import { BriefcaseIcon, PlaneTakeoffIcon } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"

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
}: CheckoutTravelerStepProps) {
  return (
    <div className="space-y-7">
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
              paymentMode === "pay_now" ? "border-emerald-500 bg-emerald-50/50" : "bg-card",
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
          {(passengers ?? []).map((passenger, index) => (
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
          Continue to extras
        </Button>
      </div>
    </div>
  )
}
