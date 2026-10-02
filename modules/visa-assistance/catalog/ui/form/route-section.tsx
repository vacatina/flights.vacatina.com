"use client"

import { Controller, useFormContext } from "react-hook-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import type { VisaListingInput } from "@/modules/visa-assistance/catalog/domain/listing"
import { CountrySearchField } from "@/modules/visa-assistance/ui/country-search-field"
import { ListingTextField } from "./text-field"

export function ListingRouteSection() {
  const { control } = useFormContext<VisaListingInput>()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Route and visa</CardTitle>
        <CardDescription>
          Choose the passport country, destination, and visa you offer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            {(
              [
                ["nationalityCode", "Passport country"],
                ["destinationCode", "Destination"],
              ] as const
            ).map(([name, label]) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={name}>{label}</FieldLabel>
                    <CountrySearchField
                      id={name}
                      buttonRef={field.ref}
                      onBlur={field.onBlur}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={`Select ${label.toLowerCase()}`}
                      invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
          <FieldGroup className="grid gap-5 md:grid-cols-[1fr_2fr]">
            <ListingTextField
              name="code"
              label="Visa code"
              placeholder="TOURIST-EVISA"
              maxLength={40}
              description="A unique code for this visa on this route."
            />
            <ListingTextField
              name="title"
              label="Public visa name"
              placeholder="India Tourist eVisa"
              maxLength={160}
              description="The name customers see in search results."
            />
          </FieldGroup>
          <ListingTextField
            name="shortSummary"
            label="Short summary"
            multiline
            placeholder="A tourist visa for short visits, holidays, and visiting family."
            maxLength={500}
            description="Up to 500 characters. Keep this clear and easy to scan."
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
