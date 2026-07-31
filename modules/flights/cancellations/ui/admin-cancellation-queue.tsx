import Link from "next/link"
import {
  ArrowRightIcon,
  CalendarIcon,
  CircleDollarSignIcon,
  FilterIcon,
} from "lucide-react"

import type { AdminCancellationQueueItem } from "@/modules/flights/cancellations/server/service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdminCancellationQueueProps {
  items: AdminCancellationQueueItem[]
}

export function AdminCancellationQueue({ items }: AdminCancellationQueueProps) {
  const manualCount = items.filter((item) => item.status === "manual_processing").length
  const refundCount = items.filter((item) => item.status === "refund_pending").length

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <QueueStat label="Requests" value={items.length} icon={FilterIcon} />
        <QueueStat label="Manual cases" value={manualCount} icon={CalendarIcon} />
        <QueueStat label="Refund review" value={refundCount} icon={CircleDollarSignIcon} />
      </div>

      <section className="rounded-lg border border-border bg-background p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">All cancellation work</h2>
            <p className="text-sm text-muted-foreground">
              Ordered by the latest operational update.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm">
              Departure date
            </Button>
            <Button variant="outline" size="sm">
              Booking type
            </Button>
            <Button variant="outline" size="sm">
              Date range
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[130px_minmax(180px,1fr)_140px_130px_100px_90px_44px] gap-3 border-b border-border px-2 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
                  "grid grid-cols-[130px_minmax(180px,1fr)_140px_130px_100px_90px_44px] items-center gap-3 border-b border-border px-2 py-4 text-sm transition-colors hover:bg-muted/70",
                  index === 0 && "bg-primary/[0.03]"
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                    {item.routeLabel.slice(0, 3)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {item.routeLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.bookingReference}
                    </span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{item.customerEmail}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.latestActionState}
                  </span>
                </span>
                <span className="truncate text-muted-foreground">
                  {item.departureLabel}
                </span>
                <span className="min-w-0">
                  <Badge variant="secondary" className="rounded-full">
                    {item.statusLabel}
                  </Badge>
                </span>
                <span className="truncate font-medium">{item.refundLabel}</span>
                <span className="truncate text-muted-foreground">
                  {item.serviceFeeLabel}
                </span>
                <span className="flex justify-end">
                  <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background">
                    <ArrowRightIcon className="size-4" />
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
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </div>
    </section>
  )
}
