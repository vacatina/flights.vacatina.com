"use client"

import { Controller, useFormContext, useWatch } from "react-hook-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatSerializedMoney } from "@/modules/currency/domain/money"
import { CURRENCY_REGISTRY } from "@/modules/currency/domain/registry"
import type { VisaListingInput } from "@/modules/visa-assistance/catalog/domain/listing"
import {
  getListingEstimate,
  parseListingFee,
} from "@/modules/visa-assistance/catalog/domain/money"
import { ListingTextField } from "./text-field"

const currencies = [
  { value: null, label: "Select currency" },
  ...CURRENCY_REGISTRY.map((currency) => ({
    value: currency.code,
    label: `${currency.code} — ${currency.name}`,
  })),
]

export function ListingFeesSection() {
  const { control } = useFormContext<VisaListingInput>()
  const [currency, governmentFee, processingFee] = useWatch({
    control,
    name: ["feeCurrency", "governmentFee", "processingFee"],
  })
  let estimate = null
  try {
    estimate = getListingEstimate({
      feeCurrency: currency ?? null,
      governmentFeeMinor: parseListingFee(governmentFee, currency ?? null),
      processingFeeMinor: parseListingFee(processingFee, currency ?? null),
    })
  } catch {
    /* Invalid partial input is handled by the field validation. */
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated fees</CardTitle>
        <CardDescription>
          Enter the final customer fees for one traveler.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Controller
            name="feeCurrency"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="feeCurrency">Listing currency</FieldLabel>
                <Select
                  items={currencies}
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="feeCurrency"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {currencies.map((item) => (
                        <SelectItem
                          key={item.value ?? "placeholder"}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Both fees use this currency. Customer display conversion is
                  separate.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <ListingTextField
              name="governmentFee"
              label="Government fee"
              placeholder="0.00"
              description="Enter 0 if there is no government fee."
            />
            <ListingTextField
              name="processingFee"
              label="Vacatina processing fee"
              placeholder="25.00"
              description="Include your service margin in this amount."
            />
          </FieldGroup>
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3">
        <span className="text-muted-foreground">
          Estimated total per traveler
        </span>
        <strong className="text-lg tabular-nums">
          {estimate ? formatSerializedMoney(estimate) : "Enter both fees"}
        </strong>
      </CardFooter>
    </Card>
  )
}
