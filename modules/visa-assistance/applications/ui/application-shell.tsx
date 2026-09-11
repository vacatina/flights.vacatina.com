import Link from "next/link"
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  LockKeyholeIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  VISA_APPLICATION_STEPS,
  type VisaApplicationDetail,
} from "@/modules/visa-assistance/applications/domain"
import { getVisaCountry } from "@/modules/visa-assistance/domain"
import { VisaApplicationPricingEstimate } from "@/modules/visa-assistance/applications/ui/pricing-estimate"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"

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
    <main className="min-h-[calc(100svh-5rem)] bg-muted/30 py-8 md:py-12">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Badge className="w-fit" variant="secondary">
              Request {application.reference}
            </Badge>
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              {application.visaName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {nationality ? <CountryFlag src={nationality.flagSrc} /> : null}
              <span>{nationality?.name ?? application.nationalityCode}</span>
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              {destination ? <CountryFlag src={destination.flagSrc} /> : null}
              <span>{destination?.name ?? application.destinationCode}</span>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Complete each step at your own pace. Your progress is saved as you
            continue.
          </p>
        </div>

        <ApplicationProgress
          applicationId={application.id}
          currentIndex={currentIndex}
        />

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div
            key={currentStep}
            className="motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
          >
            {children}
          </div>
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
    <nav
      aria-label="Visa request progress"
      className="rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10 md:p-5"
    >
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium">
          Step {currentIndex + 1} of {VISA_APPLICATION_STEPS.length}
        </span>
        <span className="text-muted-foreground">
          {stepLabels[VISA_APPLICATION_STEPS[currentIndex]]}
        </span>
      </div>
      <Progress
        value={progress}
        aria-label={`${Math.round(progress)}% complete`}
      />
      <ol className="mt-4 flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
        {VISA_APPLICATION_STEPS.map((step, index) => {
          const reachable = index <= currentIndex

          return (
            <li key={step}>
              <Link
                href={`/visa-assistance/applications/${applicationId}/${step}`}
                aria-current={index === currentIndex ? "step" : undefined}
                className={cn(
                  "flex min-w-max items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                  index === currentIndex && "bg-primary/5",
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
                    <CheckIcon className="size-3.5" aria-hidden="true" />
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
        <CardDescription>Your current application at a glance.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="flex flex-col gap-3 text-sm">
          <SummaryRow
            icon={<UsersIcon />}
            label="Travelers"
            value={application.travelerCount}
          />
          <SummaryRow
            icon={<CalendarDaysIcon />}
            label="Entry date"
            value={application.entryDate ?? "Not added"}
          />
          <SummaryRow
            label="Status"
            value={
              <Badge variant="secondary">
                {formatStatus(application.status)}
              </Badge>
            }
          />
        </dl>
        <Separator />
        <div className="flex flex-col gap-2">
          <VisaApplicationPricingEstimate
            pricing={application.pricingSnapshot}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            This is an estimate only. No payment is collected in this flow.
          </p>
        </div>
        <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <LockKeyholeIcon
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>Your submitted details and files are handled securely.</span>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon ? <span className="[&_svg]:size-4">{icon}</span> : null}
        {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function formatStatus(status: string) {
  const label = status.replaceAll("_", " ")
  return label.charAt(0).toUpperCase() + label.slice(1)
}
