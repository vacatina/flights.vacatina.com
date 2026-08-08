import Link from "next/link"
import {
  ArrowDownAZIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  SearchIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { AdminBookingListQuery } from "@/modules/flights/orders/domain/admin-schema"
import type {
  AdminBookingListItem,
  listAdminBookings,
} from "@/modules/flights/orders/server/admin-service"

interface AdminBookingsTableProps {
  result: Awaited<ReturnType<typeof listAdminBookings>>
}

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "payment_pending", label: "Payment pending" },
  { value: "on_hold", label: "Pay later" },
  { value: "cancellation_in_progress", label: "Cancellation in progress" },
  { value: "cancelled", label: "Cancelled" },
] as const

const sortOptions = [
  { value: "newest", label: "Newest booked" },
  { value: "oldest", label: "Oldest booked" },
  { value: "amount_high", label: "Highest value" },
  { value: "amount_low", label: "Lowest value" },
] as const

export function AdminBookingsTable({ result }: AdminBookingsTableProps) {
  const hasFilters = Boolean(
    result.q || result.status !== "all" || result.sort !== "newest"
  )
  const firstResult =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1
  const lastResult = Math.min(result.page * result.pageSize, result.total)

  return (
    <div className="flex flex-col gap-5">
      <Card className="rounded-md">
        <CardHeader className="border-b">
          <CardTitle>Find a booking</CardTitle>
          <CardDescription>
            Search by booking reference, email, airline PNR, Duffel order,
            checkout ID, or route.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/admin/bookings"
            method="get"
            className="flex flex-col gap-3 xl:flex-row"
          >
            <InputGroup className="h-10 flex-1 bg-background">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                name="q"
                defaultValue={result.q ?? ""}
                placeholder="Search BK-…, customer@email.com, PNR, Duffel ID, or CMB → DXB"
                aria-label="Search all bookings"
              />
            </InputGroup>

            <Select
              name="status"
              defaultValue={result.status}
              items={statusOptions}
            >
              <SelectTrigger
                className="h-10 w-full bg-background xl:w-56"
                aria-label="Filter by booking status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select name="sort" defaultValue={result.sort} items={sortOptions}>
              <SelectTrigger
                className="h-10 w-full bg-background xl:w-48"
                aria-label="Sort bookings"
              >
                <ArrowDownAZIcon />
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button type="submit" className="h-10 shrink-0 xl:px-6">
              <SearchIcon data-icon="inline-start" />
              Search bookings
            </Button>
            {hasFilters ? (
              <Button
                variant="ghost"
                className="h-10"
                nativeButton={false}
                render={<Link href="/admin/bookings" />}
              >
                <RotateCcwIcon data-icon="inline-start" />
                Reset
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <CardHeader className="border-b">
          <CardTitle>{result.total.toLocaleString()} bookings</CardTitle>
          <CardDescription>
            {result.total === 0
              ? "No booking matches the current view."
              : `Showing ${firstResult}–${lastResult}. Open a booking for its complete operational record.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Journey</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
                      <EmptyBookings hasFilters={hasFilters} />
                    </TableCell>
                  </TableRow>
                ) : (
                  result.items.map((item) => (
                    <BookingRow key={item.bookingReference} item={item} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col divide-y md:hidden">
            {result.items.length === 0 ? (
              <div className="px-5 py-12">
                <EmptyBookings hasFilters={hasFilters} />
              </div>
            ) : (
              result.items.map((item) => (
                <BookingCard key={item.bookingReference} item={item} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {result.total > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Page {result.page} of {result.pageCount}
          </p>
          <BookingPagination result={result} />
        </div>
      ) : null}
    </div>
  )
}

function BookingRow({ item }: { item: AdminBookingListItem }) {
  return (
    <TableRow className="group">
      <TableCell className="pl-6">
        <Link
          href={`/admin/bookings/${item.bookingReference}`}
          className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          {item.bookingReference}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          PNR {item.airlineBookingReference ?? "Pending"}
        </p>
      </TableCell>
      <TableCell className="max-w-56">
        <p className="truncate font-medium">{item.customerEmail}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.passengerCount}{" "}
          {item.passengerCount === 1 ? "traveler" : "travelers"}
        </p>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
            {item.routeLabel.slice(0, 3)}
          </span>
          <div className="min-w-0">
            <p className="max-w-48 truncate font-semibold">{item.routeLabel}</p>
            <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground">
              {item.airlineName} · {item.journeyTypeLabel}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <p className="font-medium">
          {item.departureDateLabel ?? "Not available"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Booked {item.createdAtLabel}
        </p>
      </TableCell>
      <TableCell>
        <BookingStatusBadge item={item} />
      </TableCell>
      <TableCell>
        <p className="font-medium">{item.paymentLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.paymentMode === "hold" ? "Hold order" : "Pay now"}
        </p>
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {item.sellAmountLabel}
      </TableCell>
      <TableCell className="pr-6 text-right">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          aria-label={`Inspect ${item.bookingReference}`}
          render={<Link href={`/admin/bookings/${item.bookingReference}`} />}
        >
          <ChevronRightIcon />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function BookingCard({ item }: { item: AdminBookingListItem }) {
  return (
    <article className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/bookings/${item.bookingReference}`}
            className="font-semibold text-primary"
          >
            {item.bookingReference}
          </Link>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {item.customerEmail}
          </p>
        </div>
        <BookingStatusBadge item={item} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <MobileDatum label="Journey" value={item.routeLabel} />
        <MobileDatum
          label="Departure"
          value={item.departureDateLabel ?? "Not available"}
        />
        <MobileDatum label="Payment" value={item.paymentLabel} />
        <MobileDatum label="Total" value={item.sellAmountLabel} />
      </div>
      <Button
        variant="outline"
        className="w-full"
        nativeButton={false}
        render={<Link href={`/admin/bookings/${item.bookingReference}`} />}
      >
        Inspect booking
        <ChevronRightIcon data-icon="inline-end" />
      </Button>
    </article>
  )
}

function BookingStatusBadge({ item }: { item: AdminBookingListItem }) {
  return (
    <Badge
      variant={
        item.statusTone === "cancelled"
          ? "destructive"
          : item.statusTone === "active"
            ? "default"
            : "secondary"
      }
      className={cn(
        "whitespace-nowrap",
        item.statusTone === "attention" && "ring-1 ring-border"
      )}
    >
      {item.statusLabel}
    </Badge>
  )
}

function MobileDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

function EmptyBookings({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <SearchIcon className="size-4 text-muted-foreground" />
      </span>
      <p className="font-semibold">
        {hasFilters ? "No matching bookings" : "No bookings yet"}
      </p>
      <p className="text-sm text-muted-foreground">
        {hasFilters
          ? "Try a broader search or reset the current filters."
          : "Bookings will appear here after an order is created."}
      </p>
    </div>
  )
}

function BookingPagination({
  result,
}: {
  result: Awaited<ReturnType<typeof listAdminBookings>>
}) {
  const pages = visiblePages(result.page, result.pageCount)

  return (
    <Pagination className="mx-0 w-auto justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={bookingHref(result, Math.max(1, result.page - 1))}
            aria-disabled={result.page === 1}
            className={cn(
              result.page === 1 && "pointer-events-none opacity-50"
            )}
          />
        </PaginationItem>
        {pages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href={bookingHref(result, page)}
              isActive={page === result.page}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href={bookingHref(
              result,
              Math.min(result.pageCount, result.page + 1)
            )}
            aria-disabled={result.page === result.pageCount}
            className={cn(
              result.page === result.pageCount &&
                "pointer-events-none opacity-50"
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

function bookingHref(result: AdminBookingListQuery, page: number) {
  const params = new URLSearchParams()
  if (result.q) params.set("q", result.q)
  if (result.status !== "all") params.set("status", result.status)
  if (result.sort !== "newest") params.set("sort", result.sort)
  if (result.pageSize !== 20) params.set("pageSize", String(result.pageSize))
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  return query ? `/admin/bookings?${query}` : "/admin/bookings"
}

function visiblePages(current: number, total: number) {
  const start = Math.max(1, Math.min(current - 1, total - 2))
  const end = Math.min(total, start + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
