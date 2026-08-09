/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangeFlightSearchForm } from "@/modules/flights/changes/ui/change-flight-search-form"

export function ChangeFlightFlow({ context }: { context: any }) {
  const legs = context.booking.legs as Array<any>
  const firstEligibleLeg = legs.find((leg) => leg.sliceId)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.08em] text-primary">Change booking</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Find replacement flights</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">The airline&apos;s live eligibility and final price will be checked before any change.</p>
      </div>
      <div className="grid gap-4">
        {legs.map((leg) => (
          <Card key={leg.legIndex} size="sm">
            <CardHeader><CardTitle>{leg.title}: {leg.routeLabel}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{leg.departureLabel}{!leg.sliceId ? " · Manual support required" : ""}</p></CardContent>
          </Card>
        ))}
      </div>
      {firstEligibleLeg ? (
        <ChangeFlightSearchForm
          bookingReference={context.booking.reference}
          sliceId={firstEligibleLeg.sliceId}
          origin={firstEligibleLeg.departureIata}
          destination={firstEligibleLeg.arrivalIata}
          departureDate={toIsoDate(firstEligibleLeg.departureAtIso)}
        />
      ) : (
        <Card><CardHeader><CardTitle>Manual support required</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">The airline has not provided a live-eligible journey for automatic replacement search. Please submit a manual change request instead.</CardContent></Card>
      )}
    </div>
  )
}

function toIsoDate(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}
