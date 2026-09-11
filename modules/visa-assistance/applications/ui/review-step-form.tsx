"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  reviewConsentSchema,
  type ReviewStepValues,
  type VisaApplicationDetail,
} from "@/modules/visa-assistance/applications/domain"
import { submitVisaApplicationAction } from "@/modules/visa-assistance/applications/server/actions"
import { VisaFormActions } from "@/modules/visa-assistance/applications/ui/form-actions"
import { VisaFormError } from "@/modules/visa-assistance/applications/ui/form-feedback"
import { VisaApplicationPricingEstimate } from "@/modules/visa-assistance/applications/ui/pricing-estimate"

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
      const result = await submitVisaApplicationAction(values)

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
    <Card>
      <CardHeader>
        <CardTitle>Review and submit</CardTitle>
        <CardDescription>
          Check the request before sending it to the Vacatina visa team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <input type="hidden" {...form.register("applicationId")} />
          <input type="hidden" {...form.register("expectedPricedAt")} />
          <VisaFormError message={serverError} />

          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Application summary</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
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

          <section className="rounded-xl bg-primary/5 p-4">
            <VisaApplicationPricingEstimate
              pricing={application.pricingSnapshot}
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Includes Vacatina&apos;s current service markup. This is not a
              payment request, and the final amount may change after review.
            </p>
          </section>

          <div className="space-y-4">
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
          </div>

          <VisaFormActions
            backHref={`/visa-assistance/applications/${application.id}/documents`}
            isPending={isPending}
            label="Submit visa request"
          />
        </form>
      </CardContent>
    </Card>
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
    <div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
            <Checkbox
              checked={field.value}
              disabled={disabled}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              aria-invalid={Boolean(error)}
            />
            <span className="leading-relaxed">{label}</span>
          </Label>
        )}
      />
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
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
