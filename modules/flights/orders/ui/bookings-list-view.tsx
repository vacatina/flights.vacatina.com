import Link from "next/link"

import type { BookingListItem } from "@/modules/flights/orders/domain"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BookingsListView(input: {
  items: BookingListItem[]
  page: number
  pageSize: number
  total: number
}) {
  const totalPages = Math.max(Math.ceil(input.total / input.pageSize), 1)
  const previousPage = Math.max(input.page - 1, 1)
  const nextPage = Math.min(input.page + 1, totalPages)

  return (
    <div className="space-y-4">
      {input.items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No bookings yet.
          </CardContent>
        </Card>
      ) : (
        input.items.map((item) => (
          <Card key={item.bookingReference} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
                <span>{item.bookingReference}</span>
                <span className="text-base">{item.sellAmountLabel}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>{item.routeLabel}</p>
              <p>
                {item.statusLabel} · {item.paymentMode}
              </p>
              <p>{item.createdAtLabel}</p>
              <Button
                className="mt-2"
                variant="outline"
                render={<Link href={`/booking/${encodeURIComponent(item.bookingReference)}`} />}
              >
                View booking
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          disabled={input.page <= 1}
          render={<Link href={`/bookings?page=${previousPage}`} />}
        >
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {input.page} of {totalPages}
        </p>
        <Button
          variant="outline"
          disabled={input.page >= totalPages}
          render={<Link href={`/bookings?page=${nextPage}`} />}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
