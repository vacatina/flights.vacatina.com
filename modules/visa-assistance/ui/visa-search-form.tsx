"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { SearchIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { cn } from "@/lib/utils"
import {
  visaSearchSchema,
  type VisaSearchValues,
} from "@/modules/visa-assistance/domain"
import { CountrySearchField } from "@/modules/visa-assistance/ui/country-search-field"

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
          "gap-7",
          compact && "gap-5",
          !compact &&
            "md:grid md:grid-cols-2 md:items-start md:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_17rem]"
        )}
      >
        <Controller
          name="nationality"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className={cn("gap-2", !compact && "gap-1")}
            >
              <FieldLabel
                className={cn(
                  !compact &&
                    "text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                )}
              >
                {compact ? "Your passport country" : "My passport"}
              </FieldLabel>
              <CountrySearchField
                value={field.value}
                onChange={field.onChange}
                placeholder={
                  compact ? "Select passport country" : "Select passport"
                }
                invalid={fieldState.invalid}
                appearance={compact ? "default" : "hero"}
              />
              {!compact ? (
                <FieldDescription className="text-sm">
                  Your citizenship country
                </FieldDescription>
              ) : null}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="destination"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className={cn("gap-2", !compact && "gap-1")}
            >
              <FieldLabel
                className={cn(
                  !compact &&
                    "text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                )}
              >
                {compact ? "Where are you going?" : "My destination"}
              </FieldLabel>
              <CountrySearchField
                value={field.value}
                onChange={field.onChange}
                placeholder="Select destination"
                invalid={fieldState.invalid}
                appearance={compact ? "default" : "hero"}
              />
              {!compact ? (
                <FieldDescription className="text-sm">
                  Where you&apos;re traveling to
                </FieldDescription>
              ) : null}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button
          type="submit"
          className={cn(
            "w-full",
            compact && "mt-1 h-12 rounded-xl px-5 text-[15px] font-medium",
            !compact &&
              "h-16 rounded-[10px] px-6 text-[16px] font-medium md:col-span-2 xl:col-span-1 xl:mt-[22px]"
          )}
        >
          {compact ? <SearchIcon data-icon="inline-start" /> : null}
          {compact ? "Check again" : "Check Visa Requirements"}
        </Button>
      </FieldGroup>
    </form>
  )
}
