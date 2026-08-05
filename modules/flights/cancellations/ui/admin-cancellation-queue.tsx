import Link from "next/link"

import type { AdminCancellationQueueItem } from "@/modules/flights/cancellations/server/service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MaterialIcon } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

interface AdminCancellationQueueProps {
  items: AdminCancellationQueueItem[]
}

export function AdminCancellationQueue({ items }: AdminCancellationQueueProps) {
  const manualCount = items.filter(
    (item) => item.status === "manual_processing"
  ).length
  const refundCount = items.filter(
    (item) => item.status === "refund_pending"
  ).length

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <QueueStat label="Requests" value={items.length} icon="list_alt" />
        <QueueStat
          label="Manual cases"
          value={manualCount}
          icon="support_agent"
        />
        <QueueStat label="Refund review" value={refundCount} icon="payments" />
      </div>

      <section className="rounded-md border border-[#dfe4ec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ebf0] px-5 py-4 md:px-6">
          <div>
            <h2 className="text-base font-semibold text-[#172033]">
              All cancellation work
            </h2>
            <p className="mt-0.5 text-sm text-[#667085]">
              Ordered by the latest operational update.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-[#d7dce5]">
              <MaterialIcon name="sort" className="text-[17px]" />
              Latest update
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto px-5 pb-2 md:px-6">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[130px_minmax(180px,1fr)_140px_130px_100px_90px_44px] gap-3 border-b border-[#e8ebf0] px-2 py-3 text-[11px] font-semibold tracking-[0.06em] text-[#7b8492] uppercase">
              <span>Destination</span>
              <span>Customer</span>
              <span>Date</span>
              <span>Status</span>
              <span>Refund</span>
              <span>Fee</span>
              <span />
            </div>

            {items.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No cancellation requests yet.
              </p>
            ) : null}

            {items.map((item, index) => (
              <Link
                key={item.id}
                href={`/admin/cancellations/${item.id}`}
                className={cn(
                  "grid grid-cols-[130px_minmax(180px,1fr)_140px_130px_100px_90px_44px] items-center gap-3 border-b border-[#edf0f4] px-2 py-4 text-sm transition-colors hover:bg-[#f8faff]",
                  index === 0 && "bg-[#fbfcff]"
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md bg-[#eef3ff] text-xs font-semibold text-[#1749d8]">
                    {item.routeLabel.slice(0, 3)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[#172033]">
                      {item.routeLabel}
                    </span>
                    <span className="text-xs text-[#7b8492]">
                      {item.bookingReference}
                    </span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{item.customerEmail}</span>
                  <span className="block truncate text-xs text-[#7b8492]">
                    {item.latestActionState}
                  </span>
                </span>
                <span className="truncate text-[#667085]">
                  {item.departureLabel}
                </span>
                <span className="min-w-0">
                  <Badge
                    variant="secondary"
                    className="bg-[#eef3ff] text-[#1749d8]"
                  >
                    {item.statusLabel}
                  </Badge>
                </span>
                <span className="truncate font-medium">{item.refundLabel}</span>
                <span className="truncate text-[#667085]">
                  {item.serviceFeeLabel}
                </span>
                <span className="flex justify-end">
                  <span className="flex size-8 items-center justify-center rounded-md text-[#7b8492] transition-colors hover:bg-[#eef3ff] hover:text-[#1749d8]">
                    <MaterialIcon
                      name="chevron_right"
                      className="text-[19px]"
                    />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
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
