"use client"

import { useId, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { SearchIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { LoadingButton } from "@/components/ui/loading-button"
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
  const formId = useId()
  const [isNavigating, startTransition] = useTransition()
  const form = useForm<VisaSearchValues>({
    resolver: zodResolver(visaSearchSchema),
    defaultValues: {
      nationality: initialValues?.nationality ?? "",
      destination: initialValues?.destination ?? "",
    },
  })

  function submit(values: VisaSearchValues) {
    startTransition(() => {
      router.push(
        `/visa-assistance/${values.nationality}/${values.destination}`
      )
    })
  }

  const submitButtonClassName = cn(
    "w-full",
    compact && "mt-1 h-12 rounded-xl px-5 text-[15px] font-medium",
    !compact &&
      "h-16 rounded-[10px] px-6 text-[16px] font-medium md:col-span-2 xl:col-span-1 xl:mt-[22px]"
  )

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
                htmlFor={`${formId}-nationality`}
                className={cn(
                  !compact &&
                    "text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                )}
              >
                {compact ? "Your passport country" : "My passport"}
              </FieldLabel>
              <CountrySearchField
                id={`${formId}-nationality`}
                buttonRef={field.ref}
                onBlur={field.onBlur}
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
                htmlFor={`${formId}-destination`}
                className={cn(
                  !compact &&
                    "text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                )}
              >
                {compact ? "Where are you going?" : "My destination"}
              </FieldLabel>
              <CountrySearchField
                id={`${formId}-destination`}
                buttonRef={field.ref}
                onBlur={field.onBlur}
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

        {compact ? (
          <LoadingButton
            type="submit"
            isLoading={isNavigating}
            className={submitButtonClassName}
          >
            <SearchIcon data-icon="inline-start" />
            Search visa services
          </LoadingButton>
        ) : (
          <LoadingButton
            type="submit"
            isLoading={isNavigating}
            className={submitButtonClassName}
          >
            Search Visa Services
          </LoadingButton>
        )}
      </FieldGroup>
    </form>
  )
}
