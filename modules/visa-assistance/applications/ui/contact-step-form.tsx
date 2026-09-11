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
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Contact details</CardTitle>
          <CardDescription>
            We will use these details for updates about this request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <input type="hidden" {...form.register("applicationId")} />
            <VisaFormError message={serverError} />
            <Field data-invalid={Boolean(form.formState.errors.contactEmail)}>
              <FieldLabel htmlFor="contactEmail">Email address</FieldLabel>
              <Input
                id="contactEmail"
                type="email"
                disabled={isPending}
                autoComplete="email"
                placeholder="name@example.com"
                aria-invalid={Boolean(form.formState.errors.contactEmail)}
                {...form.register("contactEmail")}
              />
              <FieldDescription>
                We will send application updates to this address.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.contactEmail]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.contactPhone)}>
              <FieldLabel htmlFor="contactPhone">Phone number</FieldLabel>
              <Input
                id="contactPhone"
                type="tel"
                disabled={isPending}
                autoComplete="tel"
                placeholder="+94 77 123 4567"
                aria-invalid={Boolean(form.formState.errors.contactPhone)}
                {...form.register("contactPhone")}
              />
              <FieldDescription>
                Include the international country code.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.contactPhone]} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="border-t bg-muted/20">
          <VisaFormActions
            backHref={`/visa-assistance/applications/${applicationId}/travelers`}
            isPending={isPending}
          />
        </CardFooter>
      </Card>
    </form>
  )
}
