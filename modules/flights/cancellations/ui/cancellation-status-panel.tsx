import Link from "next/link"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react"

import type { CancellationStatusSummary } from "@/modules/flights/cancellations/server/service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
      <Card size="sm">
        <CardHeader>
          <div className="flex items-start gap-3">
            <ClockIcon className="mt-0.5 size-5 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <CardTitle>Need to cancel?</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cancellation requests are reviewed within 24 hours.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardFooter>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            render={
              <Link
                href={`/booking/${encodeURIComponent(bookingReference)}/cancel`}
              />
            }
          >
            Request cancellation
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const presentation = getCancellationPanelPresentation(status.status)
  const StatusIcon = presentation.icon

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <StatusIcon className="mt-0.5 size-5 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{presentation.title}</CardTitle>
              <Badge variant={presentation.badgeVariant}>
                {status.statusLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {presentation.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {status.customerMessage ? (
          <p className="text-sm text-foreground">{status.customerMessage}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Last updated {status.updatedAtLabel}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          render={
            <Link
              href={`/booking/${encodeURIComponent(bookingReference)}/cancel`}
            />
          }
        >
          Review cancellation details
        </Button>
      </CardFooter>
    </Card>
  )
}

function getCancellationPanelPresentation(
  status: CancellationStatusSummary["status"]
) {
  if (status === "completed") {
    return {
      title: "Cancellation complete",
      description:
        "This flight is cancelled and the refund process is complete.",
      badgeVariant: "destructive" as const,
      icon: CheckCircle2Icon,
    }
  }

  if (
    ["duffel_cancelled", "refund_pending", "refund_completed"].includes(status)
  ) {
    return {
      title: "Flight cancelled",
      description:
        "The itinerary is no longer active. Your refund is being processed.",
      badgeVariant: "destructive" as const,
      icon: CheckCircle2Icon,
    }
  }

  if (status === "rejected") {
    return {
      title: "Cancellation declined",
      description: "The booking remains active.",
      badgeVariant: "secondary" as const,
      icon: XCircleIcon,
    }
  }

  if (status === "failed") {
    return {
      title: "Cancellation needs attention",
      description:
        "The booking remains active because cancellation was not completed.",
      badgeVariant: "secondary" as const,
      icon: AlertTriangleIcon,
    }
  }

  return {
    title: "Cancellation in progress",
    description: "The booking remains active until cancellation is confirmed.",
    badgeVariant: "secondary" as const,
    icon: ClockIcon,
  }
}
