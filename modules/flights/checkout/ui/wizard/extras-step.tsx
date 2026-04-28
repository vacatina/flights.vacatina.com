"use client"

import { BriefcaseIcon } from "lucide-react"
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  extractServicesFromAncillariesPayload,
  type CheckoutPageData,
} from "@/modules/flights/checkout/domain"
import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"
import { DuffelAncillariesPanel } from "@/modules/flights/checkout/ui/duffel-ancillaries-panel"

interface CheckoutExtrasStepProps {
  data: CheckoutPageData
  form: UseFormReturn<CheckoutFormValues>
  metadataFieldArray: UseFieldArrayReturn<CheckoutFormValues, "metadata", "id">
  paymentMode: CheckoutFormValues["paymentMode"] | undefined
  onBack: () => void
  onContinue: () => void
  disabled?: boolean
  isBackNavigating?: boolean
  isContinueNavigating?: boolean
}

export function CheckoutExtrasStep({
  data,
  form,
  metadataFieldArray,
  paymentMode,
  onBack,
  onContinue,
  disabled = false,
  isBackNavigating = false,
  isContinueNavigating = false,
}: CheckoutExtrasStepProps) {
  return (
    <div className="space-y-7">
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
            {paymentMode === "hold" ? (
              <p className="text-sm text-muted-foreground">
                Extras are disabled for hold mode.
              </p>
            ) : null}
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

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl px-6"
          onClick={onBack}
          disabled={disabled}
        >
          {isBackNavigating ? (
            <Spinner data-icon="inline-start" size="sm" />
          ) : null}
          Back
        </Button>
        <Button
          type="button"
          className="h-11 rounded-xl px-6"
          onClick={onContinue}
          disabled={disabled}
        >
          {isContinueNavigating ? (
            <Spinner data-icon="inline-start" size="sm" />
          ) : null}
          Continue to pay
        </Button>
      </div>
    </div>
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
