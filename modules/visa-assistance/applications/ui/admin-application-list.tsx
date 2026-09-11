import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MaterialIcon } from "@/components/ui/material-icon"
import { Money } from "@/modules/currency/ui"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getVisaApplicationStatusLabel,
  VISA_APPLICATION_STATUSES,
  type VisaApplication,
} from "@/modules/visa-assistance/applications/domain"

export function AdminVisaApplicationList({
  applications,
  query,
  status,
  page,
  hasNextPage,
}: {
  applications: VisaApplication[]
  query?: string
  status?: string
  page: number
  hasNextPage: boolean
}) {
  const openCount = applications.filter(
    (application) => !["draft", "closed"].includes(application.status)
  ).length

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <QueueStat
          label="Results"
          value={applications.length}
          icon="list_alt"
        />
        <QueueStat
          label="Open cases"
          value={openCount}
          icon="pending_actions"
        />
        <QueueStat
          label="Needs information"
          value={
            applications.filter(
              (application) => application.status === "needs_information"
            ).length
          }
          icon="contact_support"
        />
      </div>

      <section className="rounded-md border border-[#dfe4ec] bg-white p-4 shadow-sm">
        <form className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_220px_auto]">
          <Input
            name="query"
            defaultValue={query}
            placeholder="Search reference, email, or visa"
            aria-label="Search visa requests"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            aria-label="Filter by status"
            className="h-11 rounded-md bg-muted/70 px-3 text-sm outline-none focus:ring-3 focus:ring-primary/10"
          >
            <option value="">All statuses</option>
            {VISA_APPLICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {getVisaApplicationStatusLabel(value)}
              </option>
            ))}
          </select>
          <Button type="submit">
            <MaterialIcon name="filter_list" className="text-[18px]" />
            Apply
          </Button>
        </form>
      </section>

      <section className="overflow-hidden rounded-md border border-[#dfe4ec] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-[#fafbfc]">
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Visa</TableHead>
                <TableHead>Travelers</TableHead>
                <TableHead>Estimate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-semibold text-[#1749d8]">
                    {application.reference}
                  </TableCell>
                  <TableCell>
                    {application.contactEmail ?? "Not added"}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{application.visaName}</p>
                    <p className="text-xs text-muted-foreground">
                      {application.nationalityCode} to{" "}
                      {application.destinationCode}
                    </p>
                  </TableCell>
                  <TableCell>{application.travelerCount}</TableCell>
                  <TableCell>
                    {application.pricingSnapshot?.totalSellMoney ? (
                      <Money
                        money={application.pricingSnapshot.totalSellMoney}
                      />
                    ) : (
                      "Unavailable"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getVisaApplicationStatusLabel(application.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {application.submittedAt
                      ? formatDate(application.submittedAt)
                      : "Not submitted"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={
                        <Link
                          href={`/admin/visa-applications/${application.id}`}
                        />
                      }
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {applications.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No visa requests match these filters.
          </p>
        ) : null}
        {page > 1 || hasNextPage ? (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-muted-foreground">Page {page}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                disabled={page <= 1}
                render={<Link href={buildPageHref(page - 1, query, status)} />}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                disabled={!hasNextPage}
                render={<Link href={buildPageHref(page + 1, query, status)} />}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function buildPageHref(
  page: number,
  query: string | undefined,
  status: string | undefined
) {
  const params = new URLSearchParams()
  if (query) params.set("query", query)
  if (status) params.set("status", status)
  params.set("page", String(Math.max(1, page)))
  return `/admin/visa-applications?${params}`
}

function QueueStat({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: string
}) {
  return (
    <section className="rounded-md border border-[#dfe4ec] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#667085]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[#111827]">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-md bg-[#eef3ff] text-[#1749d8]">
          <MaterialIcon name={icon} filled className="text-[21px]" />
        </span>
      </div>
    </section>
  )
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}
