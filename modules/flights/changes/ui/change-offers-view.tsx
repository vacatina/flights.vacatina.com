/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"
import { Separator } from "@/components/ui/separator"
import { DecimalMoney, FxEstimateDisclosure } from "@/modules/currency/ui"
import { selectChangeOfferAction } from "@/modules/flights/changes/server/actions"
import { FlightResultSummary } from "@/modules/flights/results/ui/flight-result-summary"

export function ChangeOffersView({ detail }: { detail: any }) {
  const hasOffers = detail.offers.length > 0
  return <div className="space-y-6"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Step 2 of 3 · Choose flight</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Replacement flights</h1><p className="mt-2 text-muted-foreground">These are quotes only. Your booking is unchanged until you select a flight and complete the final confirmation.</p></div>{hasOffers ? <><FxEstimateDisclosure sourceCurrencies={detail.offers.map((offer: any) => offer.changeTotalCurrency)} /><Accordion multiple className="space-y-5">{detail.offers.map((offer: any) => <ChangeOfferCard key={offer.id} offer={offer} bookingReference={detail.booking.reference} requestId={detail.request.id} />)}</Accordion></> : <Card><CardHeader><p className="text-lg font-semibold">These quotes are no longer available</p></CardHeader><CardContent className="space-y-4 text-sm text-muted-foreground"><p>No replacement flights were saved for this search. Your booking has not been changed and no request was submitted.</p><Button render={<Link href={`/booking/${encodeURIComponent(detail.booking.reference)}/change/flight`}>Search again</Link>}>Search replacement flights</Button></CardContent></Card>}</div>
}

function ChangeOfferCard({ offer, bookingReference, requestId }: { offer: any; bookingReference: string; requestId: string }) {
  const itinerary = toItinerary(offer.summary)
  return <Card className="group/card overflow-hidden rounded-2xl border bg-card/95 py-0 shadow-none transition-shadow hover:shadow-md"><AccordionItem value={offer.id} className="border-none"><CardHeader className="p-0"><AccordionTrigger className="w-full px-6 py-5 no-underline hover:no-underline md:px-8"><FlightResultSummary {...itinerary} /></AccordionTrigger></CardHeader><AccordionContent className="px-6 md:px-10"><div className="space-y-4 pb-6"><p className="text-sm font-medium text-foreground">Replacement itinerary</p>{itinerary.segments.length > 0 ? itinerary.segments.map((segment: any, index: number) => <div key={segment.id ?? index} className="grid gap-2 border-l-2 border-dashed border-border pl-5 text-sm md:grid-cols-[160px_1fr]"><span className="font-semibold">{segment.departing_at ? formatDateTime(segment.departing_at) : "Departure time pending"}</span><span>{segment.origin?.name ?? segment.origin?.iata_code ?? "Origin"} → {segment.destination?.name ?? segment.destination?.iata_code ?? "Destination"}<span className="block text-muted-foreground">{segment.operating_carrier?.name ?? itinerary.carrierName}{segment.operating_carrier_flight_number ? ` · ${segment.operating_carrier_flight_number}` : ""}</span></span></div>) : <p className="text-sm text-muted-foreground">Open the final quote to view complete itinerary details.</p>}<div className="flex flex-wrap gap-2 pt-2"><Badge variant="secondary">Airline penalty: {offer.penaltyAmount === null ? "None" : <DecimalMoney value={offer.penaltyAmount} currency={offer.penaltyCurrency ?? offer.changeTotalCurrency} fallbackLabel={offer.penaltyLabel} />}</Badge><Badge variant="outline">Expires {offer.expiresAtLabel}</Badge></div></div></AccordionContent></AccordionItem><Separator /><CardFooter className="flex flex-col items-start justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center md:px-10"><div><p className="text-sm text-muted-foreground">Price difference</p><p className="text-3xl font-semibold tracking-tight"><DecimalMoney value={offer.changeTotalAmount} currency={offer.changeTotalCurrency} fallbackLabel={offer.changeTotalLabel} /></p></div><form action={selectChangeOfferAction}><input type="hidden" name="bookingReference" value={bookingReference}/><input type="hidden" name="requestId" value={requestId}/><input type="hidden" name="offerId" value={offer.id}/><PendingSubmitButton className="h-11 rounded-xl px-7" pendingLabel="Creating final quote...">Select this flight</PendingSubmitButton></form></CardFooter></Card>
}

function toItinerary(summary: any) {
  const slice = summary?.slices?.add?.[0] ?? {}
  const segments = Array.isArray(slice.segments) ? slice.segments : []
  const first = segments[0] ?? {}
  const last = segments[segments.length - 1] ?? first
  const carrierName = first.operating_carrier?.name ?? summary?.operatingCarriers?.[0] ?? "Airline"
  return { carrierName, carrierCode: first.operating_carrier?.iata_code ?? null, carrierLogoUrl: first.operating_carrier?.logo_symbol_url ?? null, flightNumbersLabel: first.operating_carrier_flight_number ?? null, departureTimeLabel: time(first.departing_at), arrivalTimeLabel: time(last.arriving_at), durationLabel: slice.duration ?? "Duration shown in details", routeLabel: `${first.origin?.iata_code ?? "—"} → ${last.destination?.iata_code ?? "—"}`, stopsLabel: segments.length <= 1 ? "Non-stop" : `${segments.length - 1} stop${segments.length > 2 ? "s" : ""}`, stopsDetails: segments.length <= 1 ? "Direct flight" : "See itinerary details", segments }
}

function time(value: unknown) { if (typeof value !== "string") return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date) }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date) }
