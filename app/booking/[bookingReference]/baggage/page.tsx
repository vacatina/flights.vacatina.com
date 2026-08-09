import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActorContext } from "@/modules/auth/server"
import { getChangeBookingContext } from "@/modules/flights/changes/server"

export default async function BaggagePage({ params }: { params: Promise<{ bookingReference: string }> }) {
  const [actor, { bookingReference }] = await Promise.all([
    getActorContext({ ensureGuestSession: false }),
    params,
  ])
  const context = await getChangeBookingContext({ bookingReference, actor })

  return (
    <main className="min-h-svh py-8">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.08em] text-primary">Manage booking</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Add baggage</h1>
        </div>
        <Card>
          <CardHeader><CardTitle>Live baggage options</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Baggage availability, eligibility, quantity, and price are checked with the airline before payment.</p>
            <p>Service removal remains a manual support request.</p>
            <Button render={<Link href={`/booking/${encodeURIComponent(context.booking.reference)}/change`} />}>Back to change booking</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
