"use client"

import { useState, useTransition } from "react"
import { withVisaActionFeedback } from "./action-feedback"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import {
  reviewConsentSchema,
  type ReviewStepValues,
  type VisaApplicationDetail,
} from "@/modules/visa-assistance/applications/domain"
import { submitVisaApplicationAction } from "@/modules/visa-assistance/applications/server/actions"
import { VisaFormActions } from "@/modules/visa-assistance/applications/ui/form-actions"
import { VisaFormError } from "@/modules/visa-assistance/applications/ui/form-feedback"
import { VisaApplicationPricingEstimate } from "@/modules/visa-assistance/applications/ui/pricing-estimate"
import { VisaDocumentSummary } from "./document-summary"

export function ReviewStepForm({ detail }: { detail: VisaApplicationDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const { application, travelers, documents } = detail
  const form = useForm<ReviewStepValues>({
    resolver: zodResolver(reviewConsentSchema),
    defaultValues: {
      applicationId: application.id,
      expectedPricedAt: application.pricingSnapshot?.pricedAt ?? "",
      informationAccurate: false,
      termsAccepted: false,
      privacyAccepted: false,
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await withVisaActionFeedback(() =>
        submitVisaApplicationAction(values)
      )

      if (!result.ok) {
        setServerError(result.message)
        router.refresh()
        return
      }

      router.push(
        `/visa-assistance/applications/${application.id}/confirmation`
      )
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Review and submit</CardTitle>
          <CardDescription>
            Check the request before sending it to the Vacatina visa team.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <input type="hidden" {...form.register("applicationId")} />
          <input type="hidden" {...form.register("expectedPricedAt")} />
          <VisaFormError message={serverError} />

          <section className="rounded-xl border bg-muted/15 p-4 md:p-5">
            <h2 className="font-semibold">Application summary</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <SummaryRow label="Visa" value={application.visaName} />
              <SummaryRow label="Entry date" value={application.entryDate} />
              <SummaryRow label="Travelers" value={travelers.length} />
              <SummaryRow
                label="Documents"
                value={
                  documents.filter((item) => item.status === "uploaded").length
                }
              />
              <SummaryRow label="Email" value={application.contactEmail} />
              <SummaryRow label="Phone" value={application.contactPhone} />
            </dl>
          </section>

          <section className="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/15 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Estimated pricing</h2>
              <Badge variant="outline">No payment now</Badge>
            </div>
            <VisaApplicationPricingEstimate
              pricing={application.pricingSnapshot}
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Includes government and Vacatina processing fees for all
              travelers. No payment now. Our team will confirm the final quote
              after review.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Document checklist</h2>
            <VisaDocumentSummary detail={detail} />
          </section>

          <FieldGroup className="gap-3">
            <ConsentField
              control={form.control}
              name="informationAccurate"
              label="I confirm that the information is accurate."
              disabled={isPending}
              error={form.formState.errors.informationAccurate?.message}
            />
            <ConsentField
              control={form.control}
              name="termsAccepted"
              label="I accept the terms and conditions."
              disabled={isPending}
              error={form.formState.errors.termsAccepted?.message}
            />
            <ConsentField
              control={form.control}
              name="privacyAccepted"
              label="I consent to the processing of my personal details and documents for this visa request."
              disabled={isPending}
              error={form.formState.errors.privacyAccepted?.message}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="border-t bg-muted/20">
          <VisaFormActions
            backHref={`/visa-assistance/applications/${application.id}/documents`}
            isPending={isPending}
            label="Submit visa request"
          />
        </CardFooter>
      </Card>
    </form>
  )
}

function ConsentField({
  control,
  name,
  label,
  error,
  disabled,
}: {
  control: ReturnType<typeof useForm<ReviewStepValues>>["control"]
  name: "informationAccurate" | "termsAccepted" | "privacyAccepted"
  label: string
  error?: string
  disabled: boolean
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <FieldLabel className="cursor-pointer">
            <Field orientation="horizontal">
              <Checkbox
                checked={field.value}
                disabled={disabled}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={Boolean(error)}
              />
              <FieldContent>
                <FieldTitle>{label}</FieldTitle>
                <FieldDescription>
                  Required before the request can be submitted.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        )}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value ?? "Not added"}</dd>
    </div>
  )
}
