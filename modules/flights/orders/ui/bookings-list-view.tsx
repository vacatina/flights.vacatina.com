import Image from "next/image"
import Link from "next/link"

import type {
  BookingListItem,
  BookingListSort,
  BookingListStatusFilter,
} from "@/modules/flights/orders/domain"
import { BookingsFiltersBar } from "@/modules/flights/orders/ui/bookings-filters-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronRightIcon, PlaneTakeoffIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface BookingsListViewProps {
  items: BookingListItem[]
  page: number
  pageSize: number
  total: number
  q?: string
  status: BookingListStatusFilter
  sort: BookingListSort
}

export function BookingsListView(input: BookingsListViewProps) {
  const totalPages = Math.max(Math.ceil(input.total / input.pageSize), 1)
  const previousPage = Math.max(input.page - 1, 1)
  const nextPage = Math.min(input.page + 1, totalPages)
  const hasActiveFilters =
    Boolean((input.q ?? "").trim()) || input.status !== "all" || input.sort !== "newest"

  return (
    <div className="space-y-5">
      <BookingsFiltersBar
        key={`${input.q ?? ""}:${input.status}:${input.sort}`}
        q={input.q}
        status={input.status}
        sort={input.sort}
      />

      {input.items.length === 0 ? (
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardContent className="space-y-3 pt-6">
            <p className="text-base font-medium text-foreground">No bookings found.</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or status filters.
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" className="text-base" render={<Link href="/bookings" />}>
                Clear filters
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                    Booking
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                    Journey
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                    Travelers
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                    Payment
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                    Booked on
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                    Total
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {input.items.map((item) => (
                  <TableRow key={item.bookingReference} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">
                          {item.bookingReference}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.journeyTypeLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {item.airlineLogoSymbolUrl ? (
                            <Image
                              src={item.airlineLogoSymbolUrl}
                              alt={`${item.airlineName} logo`}
                              width={20}
                              height={20}
                              unoptimized
                            />
                          ) : (
                            <PlaneTakeoffIcon className="size-4 text-muted-foreground" />
                          )}
                          <span className="line-clamp-1 text-base text-foreground">
                            {item.routeLabel}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatJourneyDateRange(item)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-base text-foreground">
                        {item.passengerCount} passenger{item.passengerCount === 1 ? "" : "s"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.legCount} leg{item.legCount === 1 ? "" : "s"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-sm", getStatusBadgeClassName(item.statusCode))}>
                        {item.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-base text-foreground">
                        {item.paymentMode === "pay_now" ? "Pay now" : "Hold order"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-base text-foreground">{item.createdAtLabel}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-base font-semibold tabular-nums text-foreground">
                        {item.sellAmountLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        className="h-9 px-3 text-base"
                        render={
                          <Link href={`/booking/${encodeURIComponent(item.bookingReference)}`} />
                        }
                      >
                        View
                        <ChevronRightIcon className="ml-1 size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 lg:hidden">
            {input.items.map((item) => (
              <Card key={item.bookingReference} className="rounded-2xl border-border/80 shadow-xs">
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">
                        {item.bookingReference}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.journeyTypeLabel}</p>
                    </div>
                    <p className="text-base font-semibold tabular-nums text-foreground">
                      {item.sellAmountLabel}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {item.airlineLogoSymbolUrl ? (
                        <Image
                          src={item.airlineLogoSymbolUrl}
                          alt={`${item.airlineName} logo`}
                          width={18}
                          height={18}
                          unoptimized
                        />
                      ) : (
                        <PlaneTakeoffIcon className="size-4 text-muted-foreground" />
                      )}
                      <p className="text-base text-foreground">{item.routeLabel}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatJourneyDateRange(item)}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Badge className={cn("text-sm", getStatusBadgeClassName(item.statusCode))}>
                      {item.statusLabel}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.passengerCount} passenger{item.passengerCount === 1 ? "" : "s"} ·{" "}
                      {item.legCount} leg{item.legCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {item.paymentMode === "pay_now" ? "Pay now" : "Hold order"} · {item.createdAtLabel}
                  </p>

                  <Button
                    className="h-9 text-base"
                    variant="ghost"
                    render={<Link href={`/booking/${encodeURIComponent(item.bookingReference)}`} />}
                  >
                    View booking
                    <ChevronRightIcon className="ml-1 size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="outline"
          className="min-w-28 text-base"
          disabled={input.page <= 1}
          render={<Link href={buildBookingsHref({ ...input, page: previousPage })} />}
        >
          Previous
        </Button>
        <p className="text-base text-muted-foreground">
          Page {input.page} of {totalPages}
        </p>
        <Button
          variant="outline"
          className="min-w-28 text-base"
          disabled={input.page >= totalPages}
          render={<Link href={buildBookingsHref({ ...input, page: nextPage })} />}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function buildBookingsHref(input: {
  page: number
  q?: string
  status: BookingListStatusFilter
  sort: BookingListSort
}) {
  const searchParams = new URLSearchParams()
  searchParams.set("page", String(input.page))
  if (input.q?.trim()) {
    searchParams.set("q", input.q.trim())
  }
  searchParams.set("status", input.status)
  searchParams.set("sort", input.sort)

  return `/bookings?${searchParams.toString()}`
}

function getStatusBadgeClassName(statusCode: BookingListItem["statusCode"]) {
  switch (statusCode) {
    case "payment_pending":
      return "border border-amber-200 bg-amber-100 text-amber-900"
    case "on_hold":
      return "border border-violet-200 bg-violet-100 text-violet-900"
    case "confirmed":
    default:
      return "border border-emerald-200 bg-emerald-100 text-emerald-900"
  }
}

function formatJourneyDateRange(item: BookingListItem) {
  if (item.departureDateLabel && item.returnDateLabel) {
    return `${item.departureDateLabel} - ${item.returnDateLabel}`
  }

  if (item.departureDateLabel) {
    return item.departureDateLabel
  }

  return "Date unavailable"
}
