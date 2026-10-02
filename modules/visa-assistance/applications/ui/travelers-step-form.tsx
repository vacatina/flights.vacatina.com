"use client"

import { useState, useTransition } from "react"
import { withVisaActionFeedback } from "./action-feedback"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { UserRoundIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  travelersStepSchema,
  type TravelersStepValues,
  type VisaApplicationTraveler,
} from "@/modules/visa-assistance/applications/domain"
import { saveVisaTravelersStepAction } from "@/modules/visa-assistance/applications/server/actions"
import { visaCountries } from "@/modules/visa-assistance/domain"
import { VisaFormActions } from "@/modules/visa-assistance/applications/ui/form-actions"
import { VisaFormError } from "@/modules/visa-assistance/applications/ui/form-feedback"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"

const titles = ["Mr", "Mrs", "Ms", "Miss", "Mx"] as const

export function TravelersStepForm({
  applicationId,
  travelerCount,
  nationalityCode,
  travelers,
}: {
  applicationId: string
  travelerCount: number
  nationalityCode: string
  travelers: VisaApplicationTraveler[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<TravelersStepValues>({
    resolver: zodResolver(travelersStepSchema),
    defaultValues: {
      applicationId,
      travelers: Array.from({ length: travelerCount }, (_, position) => {
        const traveler = travelers.find(
          (candidate) => candidate.position === position
        )

        return {
          position,
          title: asTitle(traveler?.title),
          firstName: traveler?.firstName ?? "",
          lastName: traveler?.lastName ?? "",
          nationalityCode: traveler?.nationalityCode ?? nationalityCode,
          dateOfBirth: traveler?.dateOfBirth ?? "",
          passportNumber: traveler?.passportNumber ?? "",
          passportExpiryDate: traveler?.passportExpiryDate ?? "",
        }
      }),
    },
  })
  const watchedTravelers = useWatch({
    control: form.control,
    name: "travelers",
  })

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await withVisaActionFeedback(() =>
        saveVisaTravelersStepAction(values)
      )

      if (!result.ok) {
        setServerError(result.message)
        return
      }

      router.push(`/visa-assistance/applications/${applicationId}/contact`)
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Traveler information</CardTitle>
          <CardDescription>
            Enter every name exactly as it appears in the passport.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <input type="hidden" {...form.register("applicationId")} />
            <VisaFormError message={serverError} />

            {form.getValues("travelers").map((traveler, index) => {
              const selectedCountry = visaCountries.find(
                (country) =>
                  country.code ===
                  (watchedTravelers[index]?.nationalityCode ?? nationalityCode)
              )

              return (
                <FieldSet
                  key={`traveler-${traveler.position}`}
                  disabled={isPending}
                  className="gap-5 rounded-xl border bg-muted/15 p-4 md:p-5"
                >
                  <FieldLegend className="flex w-full items-center gap-2 border-b pb-4">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRoundIcon className="size-4" aria-hidden="true" />
                    </span>
                    Traveler {index + 1}
                    {index === 0 ? (
                      <Badge className="ml-auto" variant="secondary">
                        Primary traveler
                      </Badge>
                    ) : null}
                  </FieldLegend>
                  <input
                    type="hidden"
                    {...form.register(`travelers.${index}.position`, {
                      valueAsNumber: true,
                    })}
                  />
                  <div className="grid gap-5 sm:grid-cols-[120px_1fr_1fr]">
                    <FormField
                      label="Title"
                      htmlFor={`traveler-${index}-title`}
                      error={
                        form.formState.errors.travelers?.[index]?.title?.message
                      }
                    >
                      <select
                        id={`traveler-${index}-title`}
                        className={selectClassName}
                        aria-label={`Traveler ${index + 1} title`}
                        aria-invalid={Boolean(
                          form.formState.errors.travelers?.[index]?.title
                        )}
                        {...form.register(`travelers.${index}.title`)}
                      >
                        {titles.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField
                      label="First name"
                      htmlFor={`traveler-${index}-first-name`}
                      error={
                        form.formState.errors.travelers?.[index]?.firstName
                          ?.message
                      }
                    >
                      <Input
                        id={`traveler-${index}-first-name`}
                        autoComplete="given-name"
                        placeholder="As shown on passport"
                        aria-invalid={Boolean(
                          form.formState.errors.travelers?.[index]?.firstName
                        )}
                        {...form.register(`travelers.${index}.firstName`)}
                      />
                    </FormField>
                    <FormField
                      label="Last name"
                      htmlFor={`traveler-${index}-last-name`}
                      error={
                        form.formState.errors.travelers?.[index]?.lastName
                          ?.message
                      }
                    >
                      <Input
                        id={`traveler-${index}-last-name`}
                        autoComplete="family-name"
                        placeholder="As shown on passport"
                        aria-invalid={Boolean(
                          form.formState.errors.travelers?.[index]?.lastName
                        )}
                        {...form.register(`travelers.${index}.lastName`)}
                      />
                    </FormField>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      label="Nationality"
                      htmlFor={`traveler-${index}-nationality`}
                      error={
                        form.formState.errors.travelers?.[index]
                          ?.nationalityCode?.message
                      }
                    >
                      <div className="relative">
                        {selectedCountry ? (
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                            <CountryFlag src={selectedCountry.flagSrc} />
                          </span>
                        ) : null}
                        <select
                          id={`traveler-${index}-nationality`}
                          className={cn(selectClassName, "pl-12")}
                          aria-label={`Traveler ${index + 1} nationality`}
                          aria-invalid={Boolean(
                            form.formState.errors.travelers?.[index]
                              ?.nationalityCode
                          )}
                          {...form.register(
                            `travelers.${index}.nationalityCode`
                          )}
                        >
                          {visaCountries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </FormField>
                    <FormField
                      label="Passport number"
                      htmlFor={`traveler-${index}-passport`}
                      error={
                        form.formState.errors.travelers?.[index]?.passportNumber
                          ?.message
                      }
                    >
                      <Input
                        id={`traveler-${index}-passport`}
                        autoComplete="off"
                        placeholder="e.g. N1234567"
                        aria-invalid={Boolean(
                          form.formState.errors.travelers?.[index]
                            ?.passportNumber
                        )}
                        {...form.register(`travelers.${index}.passportNumber`)}
                      />
                    </FormField>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      label="Date of birth"
                      htmlFor={`traveler-${index}-birth-date`}
                      error={
                        form.formState.errors.travelers?.[index]?.dateOfBirth
                          ?.message
                      }
                    >
                      <Input
                        id={`traveler-${index}-birth-date`}
                        type="date"
                        aria-invalid={Boolean(
                          form.formState.errors.travelers?.[index]?.dateOfBirth
                        )}
                        {...form.register(`travelers.${index}.dateOfBirth`)}
                      />
                    </FormField>
                    <FormField
                      label="Passport expiry date"
                      htmlFor={`traveler-${index}-passport-expiry`}
                      error={
                        form.formState.errors.travelers?.[index]
                          ?.passportExpiryDate?.message
                      }
                    >
                      <Input
                        id={`traveler-${index}-passport-expiry`}
                        type="date"
                        aria-invalid={Boolean(
                          form.formState.errors.travelers?.[index]
                            ?.passportExpiryDate
                        )}
                        {...form.register(
                          `travelers.${index}.passportExpiryDate`
                        )}
                      />
                    </FormField>
                  </div>
                </FieldSet>
              )
            })}
          </FieldGroup>
        </CardContent>
        <CardFooter className="border-t bg-muted/20">
          <VisaFormActions
            backHref={`/visa-assistance/applications/${applicationId}/trip`}
            isPending={isPending}
          />
        </CardFooter>
      </Card>
    </form>
  )
}

function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function asTitle(value: string | undefined): (typeof titles)[number] {
  return titles.find((title) => title === value) ?? "Mr"
}

const selectClassName = cn(
  "h-11 w-full rounded-md border border-transparent bg-muted/70 px-3",
  "text-sm outline-none focus:border-primary/20 focus:ring-3",
  "focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
)
