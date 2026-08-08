import Link from "next/link"
import {
  ArrowDownAZIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  CreditCardIcon,
  RotateCcwIcon,
  SearchIcon,
  TriangleAlertIcon,
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
import { OriginalDecimalMoney } from "@/modules/currency/ui"
import type { AdminPaymentListQuery } from "@/modules/payments/domain"
import type {
  AdminPaymentListItem,
  listAdminPayments,
} from "@/modules/payments/server/admin-service"

interface AdminPaymentsTableProps {
  result: Awaited<ReturnType<typeof listAdminPayments>>
}

const paymentStatusOptions = [
  { value: "all", label: "All payment states" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Payment pending" },
  { value: "attention", label: "Needs attention" },
  { value: "refunded", label: "Refunded" },
] as const

const refundStatusOptions = [
  { value: "all", label: "All refund states" },
  { value: "none", label: "No refund" },
  { value: "pending", label: "Refund pending" },
  { value: "completed", label: "Refund completed" },
  { value: "failed", label: "Refund failed" },
] as const

const sortOptions = [
  { value: "newest", label: "Newest payment" },
  { value: "oldest", label: "Oldest payment" },
  { value: "amount_high", label: "Highest value" },
  { value: "amount_low", label: "Lowest value" },
] as const

export function AdminPaymentsTable({ result }: AdminPaymentsTableProps) {
  const hasFilters = Boolean(
    result.q ||
    result.paymentStatus !== "all" ||
    result.refundStatus !== "all" ||
    result.sort !== "newest"
  )
  const firstResult =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1
  const lastResult = Math.min(result.page * result.pageSize, result.total)

  return (
    <div className="flex flex-col gap-5">
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Payment summary"
      >
        <SummaryCard
          icon={CreditCardIcon}
          label="Payment attempts"
          value={result.summary.total}
          note="All recorded attempts"
        />
        <SummaryCard
          icon={CheckCircle2Icon}
          label="Settled"
          value={result.summary.settled}
          note="Captured or fulfilled"
        />
        <SummaryCard
          icon={TriangleAlertIcon}
          label="Needs attention"
          value={result.summary.needsAttention}
          note="Failed, disputed, or mismatched"
          tone="attention"
        />
        <SummaryCard
          icon={CircleDollarSignIcon}
          label="Refunds in progress"
          value={result.summary.refundsPending}
          note="Pending provider completion"
          tone="pending"
        />
      </section>

      <Card className="rounded-md">
        <CardHeader className="border-b">
          <CardTitle>Find a payment</CardTitle>
          <CardDescription>
            Search by booking, customer, payment attempt, PayPal order, capture,
            or checkout ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/admin/payments"
            method="get"
            className="flex flex-col gap-3 2xl:flex-row"
          >
            <InputGroup className="h-10 flex-1 bg-background">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                name="q"
                defaultValue={result.q ?? ""}
                placeholder="Search BK-…, customer@email.com, payment or PayPal ID"
                aria-label="Search all payments"
              />
            </InputGroup>

            <Select
              name="paymentStatus"
              defaultValue={result.paymentStatus}
              items={paymentStatusOptions}
            >
              <SelectTrigger
                className="h-10 w-full bg-background 2xl:w-52"
                aria-label="Filter by payment status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {paymentStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              name="refundStatus"
              defaultValue={result.refundStatus}
              items={refundStatusOptions}
            >
              <SelectTrigger
                className="h-10 w-full bg-background 2xl:w-52"
                aria-label="Filter by refund status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {refundStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select name="sort" defaultValue={result.sort} items={sortOptions}>
              <SelectTrigger
                className="h-10 w-full bg-background 2xl:w-48"
                aria-label="Sort payments"
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

            <Button type="submit" className="h-10 shrink-0 2xl:px-6">
              <SearchIcon data-icon="inline-start" />
              Search payments
            </Button>
            {hasFilters ? (
              <Button
                variant="ghost"
                className="h-10"
                nativeButton={false}
                render={<Link href="/admin/payments" />}
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
          <CardTitle>{result.total.toLocaleString()} payments</CardTitle>
          <CardDescription>
            {result.total === 0
              ? "No payment matches the current view."
              : `Showing ${firstResult}–${lastResult}. Amounts use the authoritative checkout currency.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="hidden overflow-x-auto lg:block">
            <Table className="min-w-[1160px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Payment</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="pr-6 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
                      <EmptyPayments hasFilters={hasFilters} />
                    </TableCell>
                  </TableRow>
                ) : (
                  result.items.map((item) => (
                    <PaymentRow key={item.id} item={item} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col divide-y lg:hidden">
            {result.items.length === 0 ? (
              <div className="px-5 py-12">
                <EmptyPayments hasFilters={hasFilters} />
              </div>
            ) : (
              result.items.map((item) => (
                <PaymentCard key={item.id} item={item} />
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
          <PaymentPagination result={result} />
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "default",
}: {
  icon: typeof CreditCardIcon
  label: string
  value: number
  note: string
  tone?: "default" | "pending" | "attention"
}) {
  return (
    <Card size="sm" className="rounded-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {value.toLocaleString()}
            </CardTitle>
          </div>
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary",
              tone === "pending" && "bg-muted text-muted-foreground",
              tone === "attention" && "bg-destructive/10 text-destructive"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  )
}

function PaymentRow({ item }: { item: AdminPaymentListItem }) {
  return (
    <TableRow className="group">
      <TableCell className="pl-6">
        <Link
          href={`/admin/payments/${item.id}`}
          className="font-mono text-xs font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          {item.id}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          Updated {item.updatedAtLabel}
        </p>
      </TableCell>
      <TableCell className="max-w-56">
        {item.bookingReference ? (
          <Link
            href={`/admin/bookings/${item.bookingReference}`}
            className="font-semibold underline-offset-4 hover:text-primary hover:underline"
          >
            {item.bookingReference}
          </Link>
        ) : (
          <p className="font-medium">Checkout only</p>
        )}
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.customerEmail ?? item.routeLabel}
        </p>
      </TableCell>
      <TableCell>
        <p className="font-medium">{item.provider}</p>
        <p className="mt-1 max-w-40 truncate font-mono text-xs text-muted-foreground">
          {item.providerOrderId ?? "Order not created"}
        </p>
      </TableCell>
      <TableCell>
        <PaymentStatusBadge item={item} />
        <p className="mt-1 max-w-48 text-xs text-muted-foreground">
          {item.statusDescription}
        </p>
      </TableCell>
      <TableCell>
        <RefundStatusBadge item={item} />
        {item.refundAmount !== null && item.refundCurrency ? (
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            <OriginalDecimalMoney
              value={item.refundAmount}
              currency={item.refundCurrency}
            />
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <p className="font-medium">{item.createdAtLabel}</p>
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        <OriginalDecimalMoney value={item.amount} currency={item.currency} />
      </TableCell>
      <TableCell className="pr-6 text-right">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          aria-label={`Inspect payment ${item.id}`}
          render={<Link href={`/admin/payments/${item.id}`} />}
        >
          <ChevronRightIcon />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function PaymentCard({ item }: { item: AdminPaymentListItem }) {
  return (
    <article className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/payments/${item.id}`}
            className="block truncate font-mono text-xs font-semibold text-primary"
          >
            {item.id}
          </Link>
          <p className="mt-1 truncate font-semibold">
            {item.bookingReference ?? "Checkout payment"}
          </p>
        </div>
        <PaymentStatusBadge item={item} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <MobileDatum label="Provider" value={item.provider} />
        <MobileDatum label="Refund" value={item.refundStatusLabel} />
        <MobileDatum label="Created" value={item.createdAtLabel} />
        <div>
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="mt-1 font-semibold tabular-nums">
            <OriginalDecimalMoney
              value={item.amount}
              currency={item.currency}
            />
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        nativeButton={false}
        render={<Link href={`/admin/payments/${item.id}`} />}
      >
        Inspect payment
        <ChevronRightIcon data-icon="inline-end" />
      </Button>
    </article>
  )
}

function PaymentStatusBadge({ item }: { item: AdminPaymentListItem }) {
  return (
    <Badge
      variant={
        item.statusTone === "attention"
          ? "destructive"
          : item.statusTone === "success"
            ? "default"
            : item.statusTone === "refunded"
              ? "outline"
              : "secondary"
      }
    >
      {item.statusLabel}
    </Badge>
  )
}

function RefundStatusBadge({ item }: { item: AdminPaymentListItem }) {
  const badge = (
    <Badge
      variant={
        item.refundTone === "attention"
          ? "destructive"
          : item.refundTone === "success"
            ? "default"
            : item.refundTone === "pending"
              ? "secondary"
              : "outline"
      }
    >
      {item.refundStatusLabel}
    </Badge>
  )

  return item.cancellationRequestId ? (
    <Link href={`/admin/cancellations/${item.cancellationRequestId}`}>
      {badge}
    </Link>
  ) : (
    badge
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

function EmptyPayments({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Empty className="border-0 p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchIcon />
        </EmptyMedia>
        <EmptyTitle>
          {hasFilters ? "No matching payments" : "No payments yet"}
        </EmptyTitle>
        <EmptyDescription>
          {hasFilters
            ? "Try a broader search or reset the current filters."
            : "Payment attempts will appear here when checkout begins."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function PaymentPagination({
  result,
}: {
  result: Awaited<ReturnType<typeof listAdminPayments>>
}) {
  const pages = visiblePages(result.page, result.pageCount)

  return (
    <Pagination className="mx-0 w-auto justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={paymentHref(result, Math.max(1, result.page - 1))}
            aria-disabled={result.page === 1}
            className={cn(
              result.page === 1 && "pointer-events-none opacity-50"
            )}
          />
        </PaginationItem>
        {pages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href={paymentHref(result, page)}
              isActive={page === result.page}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href={paymentHref(
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

function paymentHref(result: AdminPaymentListQuery, page: number) {
  const params = new URLSearchParams()
  if (result.q) params.set("q", result.q)
  if (result.paymentStatus !== "all") {
    params.set("paymentStatus", result.paymentStatus)
  }
  if (result.refundStatus !== "all") {
    params.set("refundStatus", result.refundStatus)
  }
  if (result.sort !== "newest") params.set("sort", result.sort)
  if (result.pageSize !== 20) params.set("pageSize", String(result.pageSize))
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  return query ? `/admin/payments?${query}` : "/admin/payments"
}

function visiblePages(current: number, total: number) {
  const start = Math.max(1, Math.min(current - 1, total - 2))
  const end = Math.min(total, start + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
