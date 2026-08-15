/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link"
import { ArrowRightIcon, BriefcaseBusinessIcon, CircleHelpIcon, PlaneTakeoffIcon, UsersRoundIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function ChangeBookingView({ context }: { context: any }) {
  const base = `/booking/${encodeURIComponent(context.booking.reference)}/change`
  const eligibleLegs = context.booking.legs.filter((leg: any) => Boolean(leg.sliceId))
  const canChangeFlight = context.canStart && eligibleLegs.length > 0

  return (
    <div className="space-y-8 pb-8">
      <section className="border-b border-slate-200 pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Manage your trip</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Change your booking</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">Search airline-supported alternatives, compare the final price, and pay only when your new itinerary is ready.</p>
          </div>
          <div className="rounded-xl border bg-muted/35 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">{context.booking.routeLabel}</p>
            <p className="mt-0.5 text-muted-foreground">Booking {context.booking.reference}</p>
          </div>
        </div>
      </section>

      {!context.canStart ? (
        <Alert className="border-amber-200 bg-amber-50/60">
          <AlertTitle>A change request is already in progress</AlertTitle>
          <AlertDescription>
            {context.cancellationConflict
              ? "A cancellation is in progress. A flight change can start once it is resolved."
              : "This booking is locked while the current request is being handled. Open its status to see the next action or wait until it is completed before starting another search."}
          </AlertDescription>
        </Alert>
      ) : null}

      {context.canStart ? <section aria-labelledby="self-service-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Self-service</p>
            <h2 id="self-service-title" className="mt-1 text-2xl font-semibold tracking-tight">What would you like to change?</h2>
          </div>
          <Badge variant="secondary">Live airline availability</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f4fbfa_100%)] shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-teal-950 text-teal-100"><PlaneTakeoffIcon className="size-5" /></span>
                  <div>
                    <CardTitle>Change a flight</CardTitle>
                    <CardDescription className="mt-1">Search a different date, destination, or cabin for an existing journey.</CardDescription>
                  </div>
                </div>
                <Badge variant={canChangeFlight ? "secondary" : "outline"}>{canChangeFlight ? "Available online" : "Support review"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {eligibleLegs.length > 0 ? eligibleLegs.map((leg: any) => (
                <div key={leg.sliceId} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{leg.title}: {leg.routeLabel}</p>
                    <p className="mt-0.5 text-slate-500">{leg.departureLabel}</p>
                  </div>
                  <span className="hidden text-xs font-medium text-teal-800 sm:block">Eligible to search</span>
                </div>
              )) : <p className="rounded-xl border border-dashed bg-white/70 p-4 text-sm text-muted-foreground">The airline has not made an online change available for this trip.</p>}
            </CardContent>
            <CardFooter className="pt-2">
              {canChangeFlight ? <Button className="group" render={<Link href={`${base}/flight`} />}>Search replacement flights <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" /></Button> : <Button variant="outline" render={<Link href={`${base}/request?type=other`} />}>Ask flight support</Button>}
            </CardFooter>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-950"><BriefcaseBusinessIcon className="size-5" /></span>
              <CardTitle className="mt-4">Add baggage</CardTitle>
              <CardDescription>See baggage services currently offered for this booking, then pay securely online.</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              {context.canStart ? <Button variant="outline" render={<Link href={`/booking/${encodeURIComponent(context.booking.reference)}/baggage`} />}>Check baggage options</Button> : <Button variant="outline" disabled>Unavailable while request is active</Button>}
            </CardFooter>
          </Card>
        </div>
      </section> : null}

      {context.canStart ? <section aria-labelledby="support-title" className="rounded-2xl border border-dashed bg-muted/30 p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-muted-foreground"><CircleHelpIcon className="size-5" /></span>
            <div>
              <h2 id="support-title" className="font-semibold">Need help with something else?</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Traveller removal, seat changes, service removal, and personal-detail corrections need an airline review. Your booking stays unchanged until our team confirms the outcome.</p>
            </div>
          </div>
          <Button variant="outline" render={<Link href={`${base}/request?type=other`} />}>Request support <UsersRoundIcon /></Button>
        </div>
      </section> : null}

      {context.latestChange ? (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle>Active change request</CardTitle>
            <CardDescription>{context.latestChange.statusLabel}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{context.latestChange.customerMessage}</CardContent>
          <CardFooter><Button variant="outline" render={<Link href={`${base}/${context.latestChange.id}`} />}>View request status</Button></CardFooter>
        </Card>
      ) : null}
    </div>
  )
}
