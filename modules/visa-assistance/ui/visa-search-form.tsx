"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon, SearchIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  visaSearchSchema,
  type VisaSearchValues,
} from "@/modules/visa-assistance/domain"
import { CountrySearchField } from "@/modules/visa-assistance/ui/country-search-field"
import { cn } from "@/lib/utils"

interface VisaSearchFormProps {
  initialValues?: Partial<VisaSearchValues>
  compact?: boolean
}

export function VisaSearchForm({
  initialValues,
  compact = false,
}: VisaSearchFormProps) {
  const router = useRouter()
  const form = useForm<VisaSearchValues>({
    resolver: zodResolver(visaSearchSchema),
    defaultValues: {
      nationality: initialValues?.nationality ?? "",
      destination: initialValues?.destination ?? "",
    },
  })

  function submit(values: VisaSearchValues) {
    router.push(`/visa-assistance/${values.nationality}/${values.destination}`)
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup
        className={cn(
          "gap-5",
          compact &&
            "lg:grid lg:grid-cols-[1fr_1fr_auto] lg:items-start lg:gap-3"
        )}
      >
        <Controller
          name="nationality"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel>Your passport country</FieldLabel>
              <CountrySearchField
                value={field.value}
                onChange={field.onChange}
                placeholder="Select passport country"
                invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="destination"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel>Where are you going?</FieldLabel>
              <CountrySearchField
                value={field.value}
                onChange={field.onChange}
                placeholder="Select destination"
                invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button
          type="submit"
          className={cn("w-full", compact && "mt-7 lg:w-auto")}
        >
          {compact ? (
            <SearchIcon data-icon="inline-start" />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
          {compact ? "Check again" : "Check visa requirements"}
        </Button>
      </FieldGroup>
    </form>
  )
}
