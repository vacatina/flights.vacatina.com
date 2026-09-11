import Link from "next/link"
import { CheckIcon, LockKeyholeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  VISA_APPLICATION_STEPS,
  type VisaApplicationDetail,
} from "@/modules/visa-assistance/applications/domain"
import { getVisaCountry } from "@/modules/visa-assistance/domain"
import { VisaApplicationPricingEstimate } from "@/modules/visa-assistance/applications/ui/pricing-estimate"

const stepLabels = {
  trip: "Trip",
  travelers: "Travelers",
  contact: "Contact",
  documents: "Documents",
  review: "Review",
} as const

interface ApplicationShellProps {
  detail: VisaApplicationDetail
  currentStep: (typeof VISA_APPLICATION_STEPS)[number]
  children: React.ReactNode
}

export function VisaApplicationShell({
  detail,
  currentStep,
  children,
}: ApplicationShellProps) {
  const { application } = detail
  const currentIndex = VISA_APPLICATION_STEPS.indexOf(currentStep)
  const nationality = getVisaCountry(application.nationalityCode)
  const destination = getVisaCountry(application.destinationCode)

  return (
    <main className="min-h-[calc(100svh-5rem)] bg-[#f5f7fb] py-8 md:py-12">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="mb-8">
          <Badge variant="secondary">Request {application.reference}</Badge>
          <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {application.visaName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {nationality?.name ?? application.nationalityCode} to{" "}
            {destination?.name ?? application.destinationCode}
          </p>
        </div>

        <ApplicationProgress
          applicationId={application.id}
          currentIndex={currentIndex}
        />

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>{children}</div>
          <ApplicationSummary detail={detail} />
        </div>
      </div>
    </main>
  )
}

function ApplicationProgress({
  applicationId,
  currentIndex,
}: {
  applicationId: string
  currentIndex: number
}) {
  const progress = ((currentIndex + 1) / VISA_APPLICATION_STEPS.length) * 100

  return (
    <nav aria-label="Visa request progress">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium">
          Step {currentIndex + 1} of {VISA_APPLICATION_STEPS.length}
        </span>
        <span className="text-muted-foreground">
          {stepLabels[VISA_APPLICATION_STEPS[currentIndex]]}
        </span>
      </div>
      <Progress value={progress} />
      <ol className="mt-4 hidden grid-cols-5 gap-2 md:grid">
        {VISA_APPLICATION_STEPS.map((step, index) => {
          const reachable = index <= currentIndex

          return (
            <li key={step}>
              <Link
                href={`/visa-assistance/applications/${applicationId}/${step}`}
                aria-current={index === currentIndex ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-xs font-medium",
                  reachable
                    ? "text-foreground"
                    : "pointer-events-none text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border",
                    index <= currentIndex &&
                      "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {index < currentIndex ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                {stepLabels[step]}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function ApplicationSummary({ detail }: { detail: VisaApplicationDetail }) {
  const { application } = detail
  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>Request summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="space-y-3 text-sm">
          <SummaryRow label="Travelers" value={application.travelerCount} />
          <SummaryRow
            label="Entry date"
            value={application.entryDate ?? "Not added"}
          />
          <SummaryRow label="Status" value={formatStatus(application.status)} />
        </dl>
        <div className="border-t pt-4">
          <VisaApplicationPricingEstimate
            pricing={application.pricingSnapshot}
          />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            This is an estimate only. No payment is collected in this flow.
          </p>
        </div>
        <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <LockKeyholeIcon className="mt-0.5 size-4 shrink-0" />
          <span>Your submitted details and files are handled securely.</span>
        </div>
      </CardContent>
    </Card>
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
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ")
}
