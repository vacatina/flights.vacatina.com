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
    <Card>
      <CardHeader>
        <CardTitle>Trip details</CardTitle>
        <CardDescription>
          Tell us when you plan to enter and who is traveling.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <input type="hidden" {...form.register("applicationId")} />
          <VisaFormError message={serverError} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Planned entry date</Label>
              <Input
                id="entryDate"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(form.formState.errors.entryDate)}
                {...form.register("entryDate")}
              />
              <FieldError message={form.formState.errors.entryDate?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="travelerCount">Number of travelers</Label>
              <Input
                id="travelerCount"
                type="number"
                disabled={isPending}
                min={1}
                max={10}
                aria-invalid={Boolean(form.formState.errors.travelerCount)}
                {...form.register("travelerCount", { valueAsNumber: true })}
              />
              <FieldError
                message={form.formState.errors.travelerCount?.message}
              />
            </div>
          </div>
          <VisaFormActions isPending={isPending} />
        </form>
      </CardContent>
    </Card>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null
}
