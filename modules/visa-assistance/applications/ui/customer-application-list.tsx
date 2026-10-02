import Link from "next/link"
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  FilePlus2Icon,
  FilesIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import type {
  VisaApplication,
  VisaApplicationStatus,
} from "@/modules/visa-assistance/applications/domain"
import { getCustomerVisaStatus } from "@/modules/visa-assistance/applications/domain"
import { getVisaCountry } from "@/modules/visa-assistance/domain"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"
import { Money } from "@/modules/currency/ui"

interface CustomerApplicationListProps {
  applications: VisaApplication[]
  page: number
  pageSize: number
  total: number
  statusCounts: Partial<Record<VisaApplicationStatus, number>>
}

export function CustomerVisaApplicationList({
  applications,
  page,
  pageSize,
  total,
  statusCounts,
}: CustomerApplicationListProps) {
  const actionNeeded = statusCounts.needs_information ?? 0
  const closed = statusCounts.closed ?? 0
  const active = Math.max(total - closed, 0)
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  return (
    <div className="flex flex-col gap-6">
      <section
        className="grid gap-3 sm:grid-cols-3"
        aria-label="Visa request summary"
      >
        <DashboardStat label="All requests" value={total} icon={FilesIcon} />
        <DashboardStat label="Active" value={active} icon={CalendarDaysIcon} />
        <DashboardStat
          label="Action needed"
          value={actionNeeded}
          icon={FilePlus2Icon}
        />
      </section>

      {applications.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilePlus2Icon />
                </EmptyMedia>
                <EmptyTitle>No visa requests yet</EmptyTitle>
                <EmptyDescription>
                  Start a visa assistance request and it will appear here.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href="/visa-assistance" />}
                >
                  Start visa request
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4" aria-label="Visa requests">
          {applications.map((application) => (
            <VisaRequestCard key={application.id} application={application} />
          ))}
        </section>
      )}

      {totalPages > 1 ? (
        <nav
          className="flex items-center justify-between"
          aria-label="Visa request pages"
        >
          <p className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              nativeButton={false}
              render={<Link href={`/visa-requests?page=${page - 1}`} />}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              nativeButton={false}
              render={<Link href={`/visa-requests?page=${page + 1}`} />}
            >
              Next
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  )
}

function VisaRequestCard({ application }: { application: VisaApplication }) {
  const status = getCustomerVisaStatus(application.status)
  const nationality = getVisaCountry(application.nationalityCode)
  const destination = getVisaCountry(application.destinationCode)
  const isDraft = application.status === "draft"
  const href = isDraft
    ? `/visa-assistance/applications/${application.id}`
    : `/visa-requests/${application.id}`

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {destination ? <CountryFlag src={destination.flagSrc} /> : null}
          {application.visaName}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{application.reference}</span>
          <span aria-hidden="true">·</span>
          {nationality ? <CountryFlag src={nationality.flagSrc} /> : null}
          <span>{nationality?.name ?? application.nationalityCode}</span>
          <span>to</span>
          <span>{destination?.name ?? application.destinationCode}</span>
        </CardDescription>
        <CardAction>
          <Badge variant={status.tone}>{status.label}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <RequestDetail
            icon={CalendarDaysIcon}
            label="Entry date"
            value={application.entryDate ?? "Not added"}
          />
          <RequestDetail
            icon={UsersIcon}
            label="Travelers"
            value={application.travelerCount}
          />
          <RequestDetail
            icon={FilesIcon}
            label="Estimated total"
            value={
              application.pricingSnapshot?.totalMoney ? (
                <Money money={application.pricingSnapshot.totalMoney} />
              ) : (
                "Unavailable"
              )
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">{status.description}</span>
            <span className="font-medium tabular-nums">{status.progress}%</span>
          </div>
          <Progress value={status.progress} aria-label={status.description} />
        </div>
      </CardContent>
      <CardFooter className="justify-between border-t bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Updated {formatDate(application.updatedAt)}
        </p>
        <Button
          size="lg"
          variant={isDraft ? "default" : "outline"}
          nativeButton={false}
          render={<Link href={href} />}
        >
          {isDraft ? "Continue application" : "View request"}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}

function DashboardStat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: LucideIcon
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  )
}

function RequestDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-0.5 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-1 font-medium tabular-nums">{value}</dd>
      </div>
    </div>
  )
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value)
}
