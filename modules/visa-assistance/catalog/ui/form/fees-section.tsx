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
  const [currency, price] = useWatch({
    control,
    name: ["feeCurrency", "price"],
  })
  let estimate = null
  try {
    estimate = getListingEstimate({
      feeCurrency: currency ?? null,
      priceMinor: parseListingFee(price, currency ?? null),
    })
  } catch {
    /* Invalid partial input is handled by the field validation. */
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price</CardTitle>
        <CardDescription>
          Enter one complete customer price per traveler, including your margin.
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
                  Customer display conversion is separate from this source
                  price.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <ListingTextField
            name="price"
            label="Price per traveler"
            placeholder="e.g. 75.00"
            description="The full estimated price. Enter 0 for a free service."
          />
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3">
        <span className="text-muted-foreground">
          Estimated total per traveler
        </span>
        <strong className="text-lg tabular-nums">
          {estimate ? formatSerializedMoney(estimate) : "Enter a price"}
        </strong>
      </CardFooter>
    </Card>
  )
}
