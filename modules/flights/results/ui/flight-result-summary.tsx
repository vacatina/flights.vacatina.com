import Image from "next/image"

export interface FlightResultSummaryProps {
  carrierName: string
  carrierCode?: string | null
  carrierLogoUrl?: string | null
  flightNumbersLabel?: string | null
  departureTimeLabel: string
  arrivalTimeLabel: string
  arrivalDayOffset?: number
  durationLabel: string
  routeLabel: string
  stopsLabel: string
  stopsDetails?: string | null
}

/** Shared compact itinerary header used by search results and replacement-flight offers. */
export function FlightResultSummary({ carrierName, carrierCode, carrierLogoUrl, flightNumbersLabel, departureTimeLabel, arrivalTimeLabel, arrivalDayOffset = 0, durationLabel, routeLabel, stopsLabel, stopsDetails }: FlightResultSummaryProps) {
  return <div className="grid w-full gap-8 text-left md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)]"><div className="flex items-center gap-5"><div className="flex size-18 items-center justify-center rounded-lg border bg-muted/50 font-semibold text-primary">{carrierLogoUrl ? <Image src={carrierLogoUrl} alt={`${carrierName} logo`} width={32} height={32} unoptimized className="size-12 object-contain" /> : carrierCode || carrierName.slice(0, 2).toUpperCase()}</div><div className="flex flex-col"><span className="text-lg leading-tight font-semibold tracking-tight md:text-xl">{departureTimeLabel} - {arrivalTimeLabel}{arrivalDayOffset > 0 ? `+${arrivalDayOffset}` : ""}</span><span className="text-sm text-muted-foreground">{flightNumbersLabel && !flightNumbersLabel.includes(",") ? carrierName : [carrierName, flightNumbersLabel].filter(Boolean).join(" · ")}</span></div></div><div className="flex flex-col gap-0.5"><span className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">Total duration</span><span className="text-lg leading-tight font-semibold tracking-tight md:text-xl">{durationLabel}</span><span className="text-sm text-muted-foreground">{routeLabel}</span></div><div className="flex flex-col gap-0.5"><span className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">Stops</span><span className="text-lg leading-tight font-semibold tracking-tight md:text-xl">{stopsLabel}</span><span className="text-sm text-muted-foreground">{stopsDetails || "Direct flight"}</span></div></div>
}
