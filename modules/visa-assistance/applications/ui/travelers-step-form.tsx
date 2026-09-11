"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await saveVisaTravelersStepAction(values)

      if (!result.ok) {
        setServerError(result.message)
        return
      }

      router.push(`/visa-assistance/applications/${applicationId}/contact`)
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traveler information</CardTitle>
        <CardDescription>
          Enter every name exactly as it appears in the passport.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <input type="hidden" {...form.register("applicationId")} />
          <VisaFormError message={serverError} />

          {form.getValues("travelers").map((traveler, index) => (
            <fieldset
              key={`traveler-${traveler.position}`}
              disabled={isPending}
              className="space-y-5 rounded-xl border p-4 md:p-5"
            >
              <legend className="px-2 font-semibold">
                Traveler {index + 1}
              </legend>
              <input
                type="hidden"
                {...form.register(`travelers.${index}.position`, {
                  valueAsNumber: true,
                })}
              />
              <div className="grid gap-5 sm:grid-cols-[120px_1fr_1fr]">
                <FormField
                  label="Title"
                  error={
                    form.formState.errors.travelers?.[index]?.title?.message
                  }
                >
                  <select
                    className={selectClassName}
                    aria-label={`Traveler ${index + 1} title`}
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
                    form.formState.errors.travelers?.[index]?.firstName?.message
                  }
                >
                  <Input
                    id={`traveler-${index}-first-name`}
                    autoComplete="given-name"
                    {...form.register(`travelers.${index}.firstName`)}
                  />
                </FormField>
                <FormField
                  label="Last name"
                  htmlFor={`traveler-${index}-last-name`}
                  error={
                    form.formState.errors.travelers?.[index]?.lastName?.message
                  }
                >
                  <Input
                    id={`traveler-${index}-last-name`}
                    autoComplete="family-name"
                    {...form.register(`travelers.${index}.lastName`)}
                  />
                </FormField>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Nationality"
                  error={
                    form.formState.errors.travelers?.[index]?.nationalityCode
                      ?.message
                  }
                >
                  <select
                    className={selectClassName}
                    aria-label={`Traveler ${index + 1} nationality`}
                    {...form.register(`travelers.${index}.nationalityCode`)}
                  >
                    {visaCountries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
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
                    {...form.register(`travelers.${index}.dateOfBirth`)}
                  />
                </FormField>
                <FormField
                  label="Passport expiry date"
                  htmlFor={`traveler-${index}-passport-expiry`}
                  error={
                    form.formState.errors.travelers?.[index]?.passportExpiryDate
                      ?.message
                  }
                >
                  <Input
                    id={`traveler-${index}-passport-expiry`}
                    type="date"
                    {...form.register(`travelers.${index}.passportExpiryDate`)}
                  />
                </FormField>
              </div>
            </fieldset>
          ))}

          <VisaFormActions
            backHref={`/visa-assistance/applications/${applicationId}/trip`}
            isPending={isPending}
          />
        </form>
      </CardContent>
    </Card>
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
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
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
