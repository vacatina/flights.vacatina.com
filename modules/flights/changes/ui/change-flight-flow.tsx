"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react"
import { CheckIcon, CircleAlertIcon, UsersRoundIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChangeFlightSearchForm } from "@/modules/flights/changes/ui/change-flight-search-form"

export function ChangeFlightFlow({ context }: { context: any }) {
  const eligibleLegs = useMemo(() => {
    const liveEligibleSliceIds = new Set<string>(context.automatedSliceIds ?? context.booking.legs.filter((leg: any) => Boolean(leg.sliceId)).map((leg: any) => leg.sliceId))
    return context.booking.legs.filter((leg: any) => Boolean(leg.sliceId) && liveEligibleSliceIds.has(leg.sliceId))
  }, [context.automatedSliceIds, context.booking.legs])
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(eligibleLegs[0]?.sliceId ?? null)
  const selectedLeg = eligibleLegs.find((leg: any) => leg.sliceId === selectedSliceId) ?? null

  return (
    <div className="w-full mx-auto max-w-screen-2xl space-y-7 pb-10">
      <header className="border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Flight change</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Search replacement flights</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">Choose the flight you want to replace, then search a new date, route, or cabin. Your booked travellers remain unchanged.</p>
      </header>

      {eligibleLegs.length > 0 ? (
        <section className="space-y-3" aria-labelledby="journey-choice-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="journey-choice-title" className="text-lg font-semibold">Flight to replace</h2>
            <Badge variant="secondary">Step 1 of 3</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {eligibleLegs.map((leg: any) => {
              const selected = leg.sliceId === selectedSliceId
              return <button key={leg.sliceId} type="button" onClick={() => setSelectedSliceId(leg.sliceId)} className={cn("flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/45 hover:bg-muted/30")} aria-pressed={selected}>
                <div>
                  <p className="text-sm font-semibold">{leg.title}</p>
                  <p className="mt-1 text-lg font-semibold tracking-tight">{leg.routeLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{leg.departureLabel}</p>
                </div>
                {selected ? <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><CheckIcon className="size-4" /></span> : <span className="text-sm font-medium text-primary">Select</span>}
              </button>
            })}
          </div>
        </section>
      ) : <Alert><CircleAlertIcon /><AlertTitle>Online change is unavailable for this trip</AlertTitle><AlertDescription>The airline has not provided an eligible flight to search. Please request help and our flight support team will review the available options.</AlertDescription></Alert>}

      {selectedLeg ? <section className="space-y-4" aria-labelledby="replacement-search-title">
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p id="replacement-search-title" className="font-semibold">Find a replacement for {selectedLeg.routeLabel}</p><p className="mt-0.5 text-sm text-muted-foreground">Update any of the fields below, then view live airline options.</p></div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><UsersRoundIcon className="size-4 text-primary" /><span>{context.booking.passengers.length} traveller{context.booking.passengers.length === 1 ? "" : "s"} on this change</span></div>
        </div>
        <ChangeFlightSearchForm bookingReference={context.booking.reference} sliceId={selectedLeg.sliceId} origin={selectedLeg.departureIata} destination={selectedLeg.arrivalIata} departureDate={toIsoDate(selectedLeg.departureAtIso)} selectedJourneyLabel={`${selectedLeg.title}: ${selectedLeg.routeLabel}`} />
      </section> : null}
    </div>
  )
}

function toIsoDate(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}
