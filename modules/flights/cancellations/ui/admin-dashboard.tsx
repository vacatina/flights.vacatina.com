import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MaterialIcon } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"
import type { AdminCancellationQueueItem } from "@/modules/flights/cancellations/server/service"

interface AdminDashboardProps {
  items: AdminCancellationQueueItem[]
}

export function AdminDashboard({ items }: AdminDashboardProps) {
  const requested = items.filter((item) => item.status === "requested").length
  const manual = items.filter(
    (item) => item.status === "manual_processing"
  ).length
  const completed = items.filter((item) => item.status === "completed").length
  const refundPending = items.filter(
    (item) => item.status === "refund_pending"
  ).length
  const latestRefunds = items
    .filter((item) =>
      ["duffel_cancelled", "refund_pending", "completed"].includes(item.status)
    )
    .slice(0, 5)
  const needsAttention = items
    .filter((item) =>
      [
        "requested",
        "quote_ready",
        "admin_review_required",
        "manual_processing",
        "refund_pending",
        "failed",
      ].includes(item.status)
    )
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="confirmation_number"
          label="Total requests"
          value={items.length}
          note="All time"
        />
        <MetricCard
          icon="hourglass_top"
          label="Waiting review"
          value={requested}
          note="Needs a decision"
          tone="amber"
        />
        <MetricCard
          icon="support_agent"
          label="Manual cases"
          value={manual}
          note="Handled by support"
          tone="navy"
        />
        <MetricCard
          icon="payments"
          label="Refund pending"
          value={refundPending}
          note={`${completed} completed`}
          tone="green"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <section className="rounded-md border border-[#dfe4ec] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ebf0] px-5 py-4 md:px-6">
            <div>
              <h2 className="text-base font-semibold text-[#172033]">
                Workflow overview
              </h2>
              <p className="mt-0.5 text-sm text-[#667085]">
                Current cancellation request distribution
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-[#d7dce5]"
              render={<Link href="/admin/cancellations" />}
            >
              View queue
              <MaterialIcon name="arrow_forward" className="text-[17px]" />
            </Button>
          </div>

          <div className="grid gap-x-8 gap-y-5 p-5 md:grid-cols-2 md:p-6">
            <StatusBar
              label="Waiting review"
              value={requested}
              total={items.length}
              color="bg-[#f59e0b]"
            />
            <StatusBar
              label="Manual processing"
              value={manual}
              total={items.length}
              color="bg-[#13357b]"
            />
            <StatusBar
              label="Refund pending"
              value={refundPending}
              total={items.length}
              color="bg-[#1749d8]"
            />
            <StatusBar
              label="Completed"
              value={completed}
              total={items.length}
              color="bg-[#16875d]"
            />
          </div>
        </section>

        <section className="rounded-md border border-[#dfe4ec] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e8ebf0] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#172033]">
                Needs attention
              </h2>
              <p className="mt-0.5 text-sm text-[#667085]">
                Open operational work
              </p>
            </div>
            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[#eef3ff] px-2 py-1 text-xs font-bold text-[#1749d8]">
              {needsAttention.length}
            </span>
          </div>
          <div className="divide-y divide-[#edf0f4] px-5">
            {needsAttention.length === 0 ? (
              <EmptyState
                icon="task_alt"
                message="No requests need attention."
              />
            ) : null}
            {needsAttention.map((item) => (
              <Link
                key={item.id}
                href={`/admin/cancellations/${item.id}`}
                className="group flex items-center gap-3 py-3.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#f3f5f8] text-[#596273] group-hover:bg-[#eef3ff] group-hover:text-[#1749d8]">
                  <MaterialIcon name="flight" className="text-[19px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#172033]">
                    {item.bookingReference}
                  </span>
                  <span className="block truncate text-xs text-[#7b8492]">
                    {item.statusLabel}
                  </span>
                </span>
                <MaterialIcon
                  name="chevron_right"
                  className="text-[19px] text-[#98a2b3]"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <section className="rounded-md border border-[#dfe4ec] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ebf0] px-5 py-4 md:px-6">
            <div>
              <h2 className="text-base font-semibold text-[#172033]">
                Recent requests
              </h2>
              <p className="mt-0.5 text-sm text-[#667085]">
                Latest cancellation activity
              </p>
            </div>
            <Button
              size="sm"
              className="bg-[#1749d8] hover:bg-[#123fc0]"
              render={<Link href="/admin/cancellations" />}
            >
              Open all requests
            </Button>
          </div>

          <div className="divide-y divide-[#edf0f4] px-5 md:px-6">
            {items.length === 0 ? (
              <EmptyState
                icon="inbox"
                message="No cancellation requests yet."
              />
            ) : null}
            {items.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={`/admin/cancellations/${item.id}`}
                className="grid gap-2 py-4 transition-colors hover:bg-[#fafbfc] md:grid-cols-[150px_minmax(0,1fr)_150px_130px] md:items-center md:px-2"
              >
                <span>
                  <span className="block text-sm font-semibold text-[#172033]">
                    {item.routeLabel}
                  </span>
                  <span className="text-xs text-[#7b8492]">
                    {item.bookingReference}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-[#344054]">
                    {item.customerEmail}
                  </span>
                  <span className="block truncate text-xs text-[#7b8492]">
                    {item.latestActionState}
                  </span>
                </span>
                <span className="text-sm text-[#667085]">
                  {item.departureLabel}
                </span>
                <StatusBadge label={item.statusLabel} status={item.status} />
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[#dfe4ec] bg-white shadow-sm">
          <div className="border-b border-[#e8ebf0] px-5 py-4">
            <h2 className="text-base font-semibold text-[#172033]">
              Latest refunds
            </h2>
            <p className="mt-0.5 text-sm text-[#667085]">
              Most recent refund work
            </p>
          </div>
          <div className="divide-y divide-[#edf0f4] px-5">
            {latestRefunds.length === 0 ? (
              <EmptyState icon="payments" message="No refund activity yet." />
            ) : null}
            {latestRefunds.map((item) => (
              <Link
                key={item.id}
                href={`/admin/cancellations/${item.id}`}
                className="flex items-center gap-3 py-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eaf7f1] text-[#16875d]">
                  <MaterialIcon
                    name="currency_exchange"
                    className="text-[19px]"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#172033]">
                    {item.bookingReference}
                  </span>
                  <span className="text-xs text-[#7b8492]">
                    {item.statusLabel}
                  </span>
                </span>
                <span className="text-sm font-semibold text-[#172033]">
                  {item.refundLabel}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  note,
  tone = "blue",
}: {
  icon: string
  label: string
  value: number
  note: string
  tone?: "blue" | "amber" | "navy" | "green"
}) {
  const tones = {
    blue: "bg-[#eef3ff] text-[#1749d8]",
    amber: "bg-[#fff7e8] text-[#b75d08]",
    navy: "bg-[#edf1f8] text-[#13357b]",
    green: "bg-[#eaf7f1] text-[#16875d]",
  }

  return (
    <section className="rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-md",
            tones[tone]
          )}
        >
          <MaterialIcon name={icon} filled className="text-[21px]" />
        </span>
        <span className="text-xs font-medium text-[#98a2b3]">{note}</span>
      </div>
      <p className="mt-5 text-sm font-medium text-[#667085]">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-[#111827]">{value}</p>
    </section>
  )
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const percentage = total <= 0 ? 0 : Math.round((value / total) * 100)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-[#344054]">{label}</span>
        <span className="font-semibold text-[#172033]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#edf0f4]">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-[#98a2b3]">
        {percentage}% of all requests
      </p>
    </div>
  )
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  const className =
    status === "completed"
      ? "bg-[#eaf7f1] text-[#11734e]"
      : status === "failed" || status === "rejected"
        ? "bg-[#fff0f0] text-[#b42318]"
        : status === "manual_processing"
          ? "bg-[#fff7e8] text-[#9a4d07]"
          : "bg-[#eef3ff] text-[#1749d8]"

  return (
    <Badge className={cn("justify-center border-0", className)}>{label}</Badge>
  )
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <MaterialIcon name={icon} className="text-[28px] text-[#b4bcc8]" />
      <p className="mt-2 text-sm text-[#7b8492]">{message}</p>
    </div>
  )
}
