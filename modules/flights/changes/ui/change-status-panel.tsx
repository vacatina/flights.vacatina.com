/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"
import { confirmZeroPriceChangeAction, retryAutomaticChangeSearchAction } from "@/modules/flights/changes/server/actions"
import { FlightChangePayPalPayment } from "@/modules/flights/changes/ui/flight-change-paypal-payment"
import { DecimalMoney, FxEstimateDisclosure } from "@/modules/currency/ui"

export function ChangeStatusPanel({ detail, review = false }: { detail: any; review?: boolean }) {
  const request = detail.request
  const pendingChange = detail.pendingChange
  const quoteReady = request.status === "quote_ready" || (request.status === "searching" && detail.offers.length > 0)
  const quoteUnavailable = request.status === "quote_unavailable"
  const retryable = request.requestType === "itinerary_change" && request.handlingMode === "manual" && request.status === "manual_processing" && !pendingChange && detail.events.some((event: any) => event.eventType === "automation_fallback" || event.eventType === "no_offers") && !detail.events.some((event: any) => event.actorType === "admin")
  const base = `/booking/${encodeURIComponent(detail.booking.reference)}/change`

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{quoteReady || quoteUnavailable ? "Replacement flight search" : review ? "Review final change" : "Change request"}</h1><Badge>{quoteReady ? "Quotes ready" : request.statusLabel}</Badge></div>
    {quoteReady ? <Card className="border-primary/20 bg-primary/[0.03]"><CardHeader><CardTitle>Your replacement flights are ready</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">These are quotes only. Your booking has not changed and no request has been submitted.</p><Button render={<Link href={`${base}/${request.id}/offers`}>View replacement flights</Link>}>View replacement flights</Button></CardContent></Card> : null}
    {quoteUnavailable ? <Alert><AlertTitle>No change request was submitted</AlertTitle><AlertDescription>{request.customerMessage}</AlertDescription></Alert> : null}
    {request.status === "completed" ? <Alert><AlertTitle>Flight change confirmed</AlertTitle><AlertDescription>{request.customerMessage ?? "Your payment was received and your updated itinerary is available on this booking."}</AlertDescription></Alert> : null}
    {request.status === "payment_pending" ? <Alert><AlertTitle>Additional payment required</AlertTitle><AlertDescription>Pay securely with PayPal. The airline quote is validated before payment is created.</AlertDescription></Alert> : null}
    {request.status === "admin_review_required" ? <Alert><AlertTitle>Admin approval required</AlertTitle><AlertDescription>This change may return money. It will not be confirmed until an administrator reviews it.</AlertDescription></Alert> : null}
    {request.status === "manual_processing" ? <Alert><AlertTitle>Manual processing</AlertTitle><AlertDescription>{request.customerMessage}</AlertDescription></Alert> : null}
    {retryable ? <Card><CardHeader><CardTitle>Try the live airline search again</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">This request did not create an airline change. You can safely try the original search again.</p><form action={retryAutomaticChangeSearchAction}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="bookingReference" value={detail.booking.reference} /><PendingSubmitButton pendingLabel="Searching live airline options...">Try online search again</PendingSubmitButton></form></CardContent></Card> : null}
    {pendingChange ? <Card><CardHeader><CardTitle>Final airline quote</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-2xl font-semibold">Price difference: <DecimalMoney value={pendingChange.changeTotalAmount} currency={pendingChange.changeTotalCurrency} fallbackLabel={pendingChange.changeTotalAmountLabel} /></p><p>Airline penalty: {pendingChange.penaltyTotalAmount === null ? "None" : <DecimalMoney value={pendingChange.penaltyTotalAmount} currency={pendingChange.penaltyTotalCurrency ?? pendingChange.changeTotalCurrency} fallbackLabel={pendingChange.penaltyLabel} />}</p><p>New itinerary total: <DecimalMoney value={pendingChange.newTotalAmount} currency={pendingChange.newTotalCurrency} /></p><p>Expires: {pendingChange.expiresAtLabel}</p><FxEstimateDisclosure sourceCurrencies={[pendingChange.changeTotalCurrency, pendingChange.penaltyTotalCurrency, pendingChange.newTotalCurrency].filter(Boolean)} /></CardContent></Card> : null}
    {request.status === "payment_pending" && request.amount && request.currency ? <FlightChangePayPalPayment requestId={request.id} bookingReference={detail.booking.reference} amount={request.amount} currency={request.currency} /> : null}
    {review && pendingChange?.changeTotalAmount === 0 && request.status === "pending_change_ready" ? <form action={confirmZeroPriceChangeAction}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="bookingReference" value={detail.booking.reference} /><PendingSubmitButton pendingLabel="Confirming with airline...">Confirm zero-price change</PendingSubmitButton></form> : null}
    <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent className="space-y-4">{detail.events.map((event: any) => <div key={event.id} className="border-l-2 pl-4"><p className="font-medium">{event.message || event.eventType}</p><p className="text-xs text-muted-foreground">{event.createdAtLabel} · {event.actorType}</p></div>)}</CardContent></Card>
    <Button variant="outline" render={<Link href={`/booking/${encodeURIComponent(detail.booking.reference)}`}>Back to booking</Link>}>Back to booking</Button>
  </div>
}
