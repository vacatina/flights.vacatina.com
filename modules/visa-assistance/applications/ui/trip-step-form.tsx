"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

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
import { Input } from "@/components/ui/input"
import {
  tripStepSchema,
  type TripStepValues,
} from "@/modules/visa-assistance/applications/domain"
import { saveVisaTripStepAction } from "@/modules/visa-assistance/applications/server/actions"
import { VisaFormActions } from "@/modules/visa-assistance/applications/ui/form-actions"
import { VisaFormError } from "@/modules/visa-assistance/applications/ui/form-feedback"

export function TripStepForm({
  applicationId,
  entryDate,
  travelerCount,
}: {
  applicationId: string
  entryDate: string | null
  travelerCount: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<TripStepValues>({
    resolver: zodResolver(tripStepSchema),
    defaultValues: {
      applicationId,
      entryDate: entryDate ?? "",
      travelerCount,
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await saveVisaTripStepAction(values)

      if (!result.ok) {
        setServerError(result.message)
        return
      }

      router.push(`/visa-assistance/applications/${applicationId}/travelers`)
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Trip details</CardTitle>
          <CardDescription>
            Tell us when you plan to enter and who is traveling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <input type="hidden" {...form.register("applicationId")} />
            <VisaFormError message={serverError} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.entryDate)}>
                <FieldLabel htmlFor="entryDate">Planned entry date</FieldLabel>
                <Input
                  id="entryDate"
                  type="date"
                  disabled={isPending}
                  aria-invalid={Boolean(form.formState.errors.entryDate)}
                  {...form.register("entryDate")}
                />
                <FieldDescription>
                  Choose the date you expect to arrive.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.entryDate]} />
              </Field>
              <Field
                data-invalid={Boolean(form.formState.errors.travelerCount)}
              >
                <FieldLabel htmlFor="travelerCount">
                  Number of travelers
                </FieldLabel>
                <Input
                  id="travelerCount"
                  type="number"
                  disabled={isPending}
                  min={1}
                  max={10}
                  placeholder="e.g. 2"
                  aria-invalid={Boolean(form.formState.errors.travelerCount)}
                  {...form.register("travelerCount", { valueAsNumber: true })}
                />
                <FieldDescription>
                  Include every traveler, including children.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.travelerCount]} />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="border-t bg-muted/20">
          <VisaFormActions isPending={isPending} />
        </CardFooter>
      </Card>
    </form>
  )
}
