import Link from "next/link"
import {
  CalendarDaysIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  PlaneTakeoffIcon,
  TicketCheckIcon,
} from "lucide-react"

import type { AdminCancellationQueueItem } from "@/modules/flights/cancellations/server/service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdminDashboardProps {
  items: AdminCancellationQueueItem[]
}

export function AdminDashboard({ items }: AdminDashboardProps) {
  const requested = items.filter((item) => item.status === "requested").length
  const manual = items.filter((item) => item.status === "manual_processing").length
  const completed = items.filter((item) => item.status === "completed").length
  const refundPending = items.filter((item) => item.status === "refund_pending").length

  const latestRefunds = items.slice(0, 5)
  const pendingCount = items.filter((item) =>
    ["requested", "quote_ready", "admin_review_required", "refund_pending"].includes(item.status)
  ).length

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={TicketCheckIcon}
          label="Total requests"
          value={items.length}
          delta="+16%"
        />
        <MetricCard
          icon={Clock3Icon}
          label="Waiting review"
          value={requested}
          delta="+11%"
        />
        <MetricCard
          icon={PlaneTakeoffIcon}
          label="Manual cases"
          value={manual}
          delta="Watch"
        />
        <MetricCard
          icon={CircleDollarSignIcon}
          label="Refund pending"
          value={refundPending}
          delta={`${completed} done`}
        />
      </div>

      {/* Analytics + Side Widgets Grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left 2 Columns: Analytics */}
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-lg border border-border bg-background p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Cancellation performance</h2>
                <p className="text-sm text-muted-foreground">
                  Internal workflow distribution.
                </p>
              </div>
              <Button size="sm" variant="outline">
                Export
              </Button>
            </div>

            <div className="grid h-56 grid-cols-8 items-end gap-3 border-b border-l border-border px-3 pt-4">
              {[44, 51, 38, 70, 45, 58, 34, 76].map((height, index) => (
                <div key={index} className="flex h-full items-end">
                  <span
                    className="w-full rounded-t-md bg-primary/20 ring-1 ring-primary/25"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Action mix</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Where requests are currently sitting.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <StatusBar label="Review required" value={requested} total={items.length} />
              <StatusBar label="Manual processing" value={manual} total={items.length} />
              <StatusBar label="Refund pending" value={refundPending} total={items.length} />
              <StatusBar label="Completed" value={completed} total={items.length} />
            </div>
          </section>
        </div>

        {/* Right Column: Review Calendar & Latest Refunds */}
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-background p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Review calendar</h2>
              <CalendarDaysIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-7 gap-1 rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <span key={`${day}-${index}`} className="font-medium">
                  {day}
                </span>
              ))}
              {Array.from({ length: 35 }, (_, index) => {
                const day = index + 1
                const highlighted = [3, 9, 17, 24, 31].includes(day)
                return (
                  <span
                    key={day}
                    className={cn(
                      "rounded-md py-1 transition-colors",
                      highlighted && "bg-primary text-primary-foreground font-semibold"
                    )}
                  >
                    {day}
                  </span>
                )
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Latest refunds</h2>
              <Badge variant="secondary" className="rounded-full">
                {pendingCount} open
              </Badge>
            </div>
            <div className="space-y-2">
              {latestRefunds.length === 0 ? (
                <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                  No refund reviews yet.
                </p>
              ) : null}
              {latestRefunds.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/admin/cancellations/${item.id}`}
                  className={cn(
                    "grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted",
                    index === 0 && "border-primary bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <span>
                    <span className="block font-semibold">
                      {item.bookingReference}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {item.statusLabel}
                    </span>
                  </span>
                  <span className="font-semibold text-foreground">{item.refundLabel}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Bookings Queue */}
      <section className="rounded-lg border border-border bg-background p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">All bookings</h2>
            <p className="text-sm text-muted-foreground">
              Cancellation work queue by departure.
            </p>
          </div>
          <Button render={<Link href="/admin/cancellations" />}>
            Open queue
          </Button>
        </div>

        <div className="space-y-1">
          {items.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href={`/admin/cancellations/${item.id}`}
              className="grid gap-3 rounded-lg border-b border-border px-2 py-4 transition-colors hover:bg-muted md:grid-cols-[180px_minmax(0,1fr)_160px_120px]"
            >
              <span>
                <span className="block font-semibold">{item.routeLabel}</span>
                <span className="text-xs text-muted-foreground">
                  {item.bookingReference}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm">
                  {item.customerEmail}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.latestActionState}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                {item.departureLabel}
              </span>
              <Badge variant="secondary" className="justify-center rounded-full">
                {item.statusLabel}
              </Badge>
            </Link>
          ))}
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No cancellation requests yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  delta: string
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <span className="text-lg text-muted-foreground">...</span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-3">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <Badge variant="secondary" className="rounded-full text-primary">
          {delta}
        </Badge>
      </div>
    </section>
  )
}

function StatusBar({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage = total <= 0 ? 0 : Math.round((value / total) * 100)

  return (
    <div className="space-y-2 py-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn("h-2 rounded-full bg-primary")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

