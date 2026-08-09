/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BookingJourneySummary } from "@/modules/flights/orders/ui"

export function ChangeBookingView({ context }: { context: any }) {
  const base = `/booking/${encodeURIComponent(context.booking.reference)}/change`
  const hasAutomatedFlightOption =
    context.canStart && context.booking.legs.some((leg: any) => Boolean(leg.sliceId))

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.08em] text-primary">Manage your trip</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Change booking</h1>
        <p className="mt-2 text-muted-foreground">
          {context.booking.routeLabel} · {context.booking.reference}
        </p>
      </div>

      {!context.canStart ? (
        <Alert>
          <AlertTitle>A booking request is already active</AlertTitle>
          <AlertDescription>
            {context.cancellationConflict
              ? "A cancellation is in progress. A flight change cannot start until it is resolved."
              : "Open the existing change request to continue or see its status."}
          </AlertDescription>
        </Alert>
      ) : null}

      <BookingJourneySummary legs={context.booking.legs} />

      <section className="space-y-4" aria-labelledby="online-change-options">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="online-change-options" className="text-xl font-semibold tracking-tight">
              Available online
            </h2>
            <Badge variant="secondary">Automated</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Search live airline options and confirm eligible changes without waiting for support.
          </p>
        </div>

        {hasAutomatedFlightOption ? (
          <Choice
            title="Change a flight"
            description="Search replacement dates, routes, or cabins. Live airline eligibility is checked before you choose an offer."
            href={`${base}/flight`}
            badge="Duffel-supported"
            disabled={!context.canStart}
          />
        ) : (
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>There are no automated flight options</CardTitle>
                  <CardDescription className="mt-2">
                    This booking does not expose an airline-changeable flight yet. Our team can still
                    review the request manually.
                  </CardDescription>
                </div>
                <Badge variant="outline">Manual review</Badge>
              </div>
            </CardHeader>
            <CardFooter>
              <Button render={<Link href={`${base}/request?type=other`} />}>Request manual help</Button>
            </CardFooter>
          </Card>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="manual-change-options">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="manual-change-options" className="text-xl font-semibold tracking-tight">
              Need another change?
            </h2>
            <Badge variant="outline">Manual request</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            These requests need an agent or airline review. Your booking will not be changed until the
            request is approved.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Choice
            title="Remove a traveller"
            description="Ask us to remove one traveller from the booking and review any airline restrictions."
            href={`${base}/request?type=remove_passenger`}
            disabled={!context.canStart}
          />
          <Choice
            title="Seat or service change"
            description="Request removal or correction of an existing seat, baggage, or other service."
            href={`${base}/request?type=seat_change`}
            disabled={!context.canStart}
          />
          <Choice
            title="Traveller details"
            description="Request a name, date-of-birth, or other traveller-detail correction."
            href={`${base}/request?type=traveller_details_change`}
            disabled={!context.canStart}
          />
          <Choice
            title="Something else"
            description="Tell our team what you need changed and we will confirm the next steps."
            href={`${base}/request?type=other`}
            disabled={!context.canStart}
          />
        </div>

        <Card className="opacity-70">
          <CardHeader>
            <CardTitle>Add baggage</CardTitle>
            <CardDescription>Post-booking baggage purchase is planned for a later phase.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Badge variant="secondary">Not available in Phase 1</Badge>
          </CardFooter>
        </Card>
      </section>

      {context.latestChange ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest change request</CardTitle>
            <CardDescription>{context.latestChange.statusLabel}</CardDescription>
          </CardHeader>
          <CardContent>{context.latestChange.customerMessage}</CardContent>
          <CardFooter>
            <Button render={<Link href={`${base}/${context.latestChange.id}`} />}>View status</Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  )
}

function Choice({
  title,
  description,
  href,
  badge,
  disabled,
}: {
  title: string
  description: string
  href: string
  badge?: string
  disabled: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        {disabled ? (
          <Button disabled>Unavailable</Button>
        ) : (
          <Button render={<Link href={href} />}>Continue</Button>
        )}
      </CardFooter>
    </Card>
  )
}
