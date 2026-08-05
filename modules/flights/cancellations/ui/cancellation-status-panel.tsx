import Link from "next/link"
import { AlertCircleIcon, CheckCircle2Icon, ClockIcon } from "lucide-react"

import type { CancellationStatusSummary } from "@/modules/flights/cancellations/server/service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CancellationStatusPanelProps {
  bookingReference: string
  status: CancellationStatusSummary | null
}

export function CancellationStatusPanel({
  bookingReference,
  status,
}: CancellationStatusPanelProps) {
  if (!status) {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <ClockIcon className="mt-0.5 size-5 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Cancellation
            </p>
            <p className="text-sm text-muted-foreground">
              Full-booking cancellation requests are reviewed by an admin within
              24 hours.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          render={
            <Link
              href={`/booking/${encodeURIComponent(bookingReference)}/cancel`}
            />
          }
        >
          Cancel booking
        </Button>
      </div>
    )
  }

  const terminal = ["completed", "rejected", "failed"].includes(status.status)

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        {terminal ? (
          <CheckCircle2Icon className="mt-0.5 size-5 text-primary" />
        ) : (
          <AlertCircleIcon className="mt-0.5 size-5 text-muted-foreground" />
        )}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              Cancellation request
            </p>
            <Badge variant="secondary" className="rounded-full">
              {status.statusLabel}
            </Badge>
          </div>
          {status.customerMessage ? (
            <p className="text-sm text-muted-foreground">
              {status.customerMessage}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Last updated {status.updatedAtLabel}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        render={
          <Link href={`/booking/${encodeURIComponent(bookingReference)}/cancel`} />
        }
      >
        View cancellation
      </Button>
    </div>
  )
}
