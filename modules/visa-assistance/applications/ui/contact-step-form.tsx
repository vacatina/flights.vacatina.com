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
  contactStepSchema,
  type ContactStepValues,
} from "@/modules/visa-assistance/applications/domain"
import { saveVisaContactStepAction } from "@/modules/visa-assistance/applications/server/actions"
import { VisaFormActions } from "@/modules/visa-assistance/applications/ui/form-actions"
import { VisaFormError } from "@/modules/visa-assistance/applications/ui/form-feedback"

export function ContactStepForm({
  applicationId,
  email,
  phone,
}: {
  applicationId: string
  email: string | null
  phone: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<ContactStepValues>({
    resolver: zodResolver(contactStepSchema),
    defaultValues: {
      applicationId,
      contactEmail: email ?? "",
      contactPhone: phone ?? "",
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await saveVisaContactStepAction(values)

      if (!result.ok) {
        setServerError(result.message)
        return
      }

      router.push(`/visa-assistance/applications/${applicationId}/documents`)
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact details</CardTitle>
        <CardDescription>
          We will use these details for updates about this request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <input type="hidden" {...form.register("applicationId")} />
          <VisaFormError message={serverError} />
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email address</Label>
            <Input
              id="contactEmail"
              type="email"
              disabled={isPending}
              autoComplete="email"
              aria-invalid={Boolean(form.formState.errors.contactEmail)}
              {...form.register("contactEmail")}
            />
            <FieldError message={form.formState.errors.contactEmail?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone number</Label>
            <Input
              id="contactPhone"
              type="tel"
              disabled={isPending}
              autoComplete="tel"
              placeholder="+94 77 123 4567"
              aria-invalid={Boolean(form.formState.errors.contactPhone)}
              {...form.register("contactPhone")}
            />
            <p className="text-xs text-muted-foreground">
              Include the international country code.
            </p>
            <FieldError message={form.formState.errors.contactPhone?.message} />
          </div>
          <VisaFormActions
            backHref={`/visa-assistance/applications/${applicationId}/travelers`}
            isPending={isPending}
          />
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
