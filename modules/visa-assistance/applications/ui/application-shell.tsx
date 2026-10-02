import Link from "next/link"
import {
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
import { VisaApplicationPricingEstimate } from "@/modules/visa-assistance/applications/ui/pricing-estimate"
import { VisaCheckoutHeading } from "./checkout-heading"
import { visaFormCard } from "./checkout-surfaces"

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

  return (
    <main className="min-h-[calc(100svh-5rem)] bg-primary/[0.035] pb-12 md:pb-16">
      <VisaCheckoutHeading detail={detail} />
      <div className="relative mx-auto -mt-6 w-full max-w-screen-2xl px-5 sm:px-8">
        <ApplicationProgress
          applicationId={application.id}
          currentIndex={currentIndex}
        />

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div
            key={currentStep}
            className="min-w-0 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
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
      className="rounded-[24px] border border-primary/10 bg-white p-4 shadow-[0_12px_30px_-22px_rgba(10,19,69,0.35)] md:p-5"
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
      <ol className="mt-4 grid grid-cols-5 gap-1 md:gap-3">
        {VISA_APPLICATION_STEPS.map((step, index) => {
          const reachable = index <= currentIndex
          const className = cn(
            "flex min-w-0 flex-col items-center gap-2 rounded-xl px-1 py-3 text-[10px] font-medium transition-colors sm:flex-row sm:justify-center sm:text-xs md:px-2",
            index === currentIndex && "bg-primary/10 ring-1 ring-primary/15",
            reachable ? "text-foreground" : "text-muted-foreground"
          )
          const content = (
            <>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/[0.035] text-primary",
                  reachable &&
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
            </>
          )

          return (
            <li key={step}>
              {reachable ? (
                <Link
                  href={`/visa-assistance/applications/${applicationId}/${step}`}
                  aria-current={index === currentIndex ? "step" : undefined}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <span aria-disabled="true" className={className}>
                  {content}
                </span>
              )}
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
    <Card className={cn(visaFormCard, "gap-0 pt-0 lg:sticky lg:top-28")}>
      <CardHeader className="bg-brand-navy py-6 text-white">
        <CardTitle>Request summary</CardTitle>
        <CardDescription className="text-white/70">
          Your current application at a glance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-6">
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
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.05] p-4">
          <VisaApplicationPricingEstimate
            pricing={application.pricingSnapshot}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            This is an estimate only. No payment is collected in this flow.
          </p>
        </div>
        <div className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
          <LockKeyholeIcon
            className="mt-0.5 size-4 shrink-0 text-primary"
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
