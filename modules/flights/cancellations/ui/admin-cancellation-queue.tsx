import Link from "next/link"
import { ExternalLinkIcon } from "lucide-react"

import type { AdminCancellationQueueItem } from "@/modules/flights/cancellations/server/service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AdminCancellationQueueProps {
  items: AdminCancellationQueueItem[]
}

export function AdminCancellationQueue({ items }: AdminCancellationQueueProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Departure</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duffel</TableHead>
            <TableHead>Refund</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No cancellation requests yet.
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.bookingReference}
              </TableCell>
              <TableCell>{item.customerEmail}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p>{item.routeLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.airlineName}
                  </p>
                </div>
              </TableCell>
              <TableCell>{item.departureLabel}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="rounded-full">
                  {item.statusLabel}
                </Badge>
              </TableCell>
              <TableCell>
                {item.duffelApiAvailable === null
                  ? "Unknown"
                  : item.duffelApiAvailable
                    ? "Available"
                    : "Manual"}
              </TableCell>
              <TableCell>{item.refundLabel}</TableCell>
              <TableCell>{item.serviceFeeLabel}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/admin/cancellations/${item.id}`} />}
                >
                  <ExternalLinkIcon className="size-4" />
                  Open
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
