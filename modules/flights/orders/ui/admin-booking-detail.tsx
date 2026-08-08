import Link from "next/link"
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  MailIcon,
  PlaneIcon,
  ReceiptTextIcon,
  UserRoundIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { AdminBookingDetailModel } from "@/modules/flights/orders/server/admin-service"

interface AdminBookingDetailProps {
  detail: AdminBookingDetailModel
}

export function AdminBookingDetail({ detail }: AdminBookingDetailProps) {
  const { booking, operationalStatus, cancellation } = detail
  const snapshot = booking.snapshot

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-5 shadow-xs md:flex-row md:items-start md:justify-between md:p-6">
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" nativeButton={false} render={<Link href="/admin/bookings" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            All bookings
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                {booking.bookingReference}
              </h2>
              <StatusBadge tone={operationalStatus.tone} label={operationalStatus.label} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {snapshot.routeLabel} · {booking.contactEmail}
            </p>
            {operationalStatus.description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{operationalStatus.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {cancellation ? (
            <Button variant="outline" nativeButton={false} render={<Link href={`/admin/cancellations/${cancellation.requestId}`} />}>
              Cancellation case
              <ExternalLinkIcon data-icon="inline-end" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Order total" value={snapshot.billingSummary.totalAmountLabel} hint={snapshot.currency} icon={<ReceiptTextIcon />} />
        <SummaryCard label="Payment" value={booking.paymentMode === "hold" ? "Pay later" : booking.paymentAmountLabel ? "Paid" : booking.statusLabel} hint={booking.paymentProvider ?? "Balance settlement"} icon={<CreditCardIcon />} />
        <SummaryCard label="Airline PNR" value={snapshot.airlineBookingReference ?? "Pending"} hint={snapshot.legs[0]?.ownerName ?? "Airline unavailable"} icon={<PlaneIcon />} />
        <SummaryCard label="Booked" value={booking.createdAtLabel} hint={`${snapshot.passengerCount} ${snapshot.passengerCount === 1 ? "traveler" : "travelers"}`} icon={<UserRoundIcon />} />
      </div>

      {cancellation ? <CancellationCard cancellation={cancellation} /> : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="rounded-md">
            <CardHeader className="border-b">
              <CardTitle>Journey</CardTitle>
              <CardDescription>{snapshot.journeyTypeLabel} · {snapshot.cabinClassLabel}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {snapshot.legs.map((leg, index) => (
                <div key={`${leg.legIndex}-${leg.routeLabel}`} className="flex flex-col gap-4">
                  {index > 0 ? <Separator /> : null}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-primary uppercase">{leg.title}</p>
                      <p className="mt-1 font-heading text-xl font-semibold">{leg.departureIata} <span className="text-muted-foreground">→</span> {leg.arrivalIata}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{leg.ownerName} · {leg.subtitle}</p>
                    </div>
                    <div className="grid grid-cols-[auto_auto_auto] items-center gap-3 text-right">
                      <div><p className="text-lg font-semibold">{leg.departureTimeLabel}</p><p className="text-xs text-muted-foreground">{leg.departureIata}</p></div>
                      <div className="min-w-20"><p className="text-xs text-muted-foreground">{leg.durationLabel}</p><div className="my-1 h-px bg-border" /><p className="text-xs text-muted-foreground">{leg.stopsLabel}</p></div>
                      <div><p className="text-lg font-semibold">{leg.arrivalTimeLabel}</p><p className="text-xs text-muted-foreground">{leg.arrivalIata}</p></div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <JourneyPoint label="Departure" value={leg.departureLabel} />
                    <JourneyPoint label="Arrival" value={leg.arrivalLabel} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader className="border-b">
              <CardTitle>Travelers</CardTitle>
              <CardDescription>Passenger names and contact details saved with the order.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y p-0">
              {snapshot.passengers.length === 0 ? (
                <p className="px-6 py-8 text-sm text-muted-foreground">No passenger information was saved.</p>
              ) : (
                snapshot.passengers.map((passenger) => (
                  <div key={passenger.id} className="flex items-start gap-4 px-6 py-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted"><UserRoundIcon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{passenger.fullName ?? passenger.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{[passenger.typeLabel, passenger.dateOfBirthLabel, passenger.genderLabel].filter(Boolean).join(" · ")}</p>
                      {passenger.email || passenger.phoneNumber ? <p className="mt-1 truncate text-sm text-muted-foreground">{[passenger.email, passenger.phoneNumber].filter(Boolean).join(" · ")}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card className="rounded-md">
            <CardHeader className="border-b">
              <CardTitle>Payment record</CardTitle>
              <CardDescription>Stored checkout and provider reconciliation data.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DetailRow label="Booking status" value={operationalStatus.label} />
              <DetailRow label="Checkout status" value={booking.checkoutSessionStatus ?? "Not available"} />
              <DetailRow label="Payment provider" value={booking.paymentProvider ?? "Not available"} />
              <DetailRow label="Paid amount" value={booking.paymentAmountLabel ?? "Not recorded"} />
              <DetailRow label="Paid at" value={booking.paidAtLabel ?? "Not recorded"} />
              {booking.paymentRequiredByLabel ? <DetailRow label="Payment due" value={booking.paymentRequiredByLabel} /> : null}
              {booking.checkoutErrorMessage ? (
                <div className="flex gap-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive"><CircleAlertIcon className="mt-0.5 size-4 shrink-0" />{booking.checkoutErrorMessage}</div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader className="border-b">
              <CardTitle>Fare summary</CardTitle>
              <CardDescription>Amounts stored at order confirmation.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DetailRow label="Fare" value={snapshot.billingSummary.fareAmountLabel ?? "Not available"} />
              <DetailRow label="Taxes" value={snapshot.billingSummary.taxesAmountLabel ?? "Not available"} />
              <Separator />
              <DetailRow label="Total" value={snapshot.billingSummary.totalAmountLabel} strong />
              <Separator />
              <DetailRow label="Changes" value={snapshot.conditions.changes} />
              <DetailRow label="Refunds" value={snapshot.conditions.refunds} />
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader className="border-b">
              <CardTitle>System identifiers</CardTitle>
              <CardDescription>Use these IDs when tracing provider or application logs.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Identifier label="Flight order" value={detail.identifiers.flightOrderId} />
              <Identifier label="Checkout session" value={detail.identifiers.checkoutSessionId} />
              <Identifier label="Duffel order" value={detail.identifiers.duffelOrderId} />
              <Identifier label="Offer request" value={detail.identifiers.partialOfferRequestId} />
              <Identifier label="Offer" value={detail.identifiers.offerId} />
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader className="border-b">
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Recent booking confirmation and reconciliation messages.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {booking.notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No booking notifications recorded.</p>
              ) : (
                booking.notifications.map((notification) => (
                  <div key={notification.id} className="flex gap-3 rounded-md border p-3">
                    <MailIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0"><p className="text-sm font-medium">{humanize(notification.eventType)}</p><p className="mt-1 text-xs text-muted-foreground">{notification.status} · {notification.createdAtLabel}</p></div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: React.ReactNode }) {
  return (
    <Card size="sm" className="rounded-md">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <CardAction><span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span></CardAction>
      </CardHeader>
      <CardContent><p className="truncate text-xl font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p></CardContent>
    </Card>
  )
}

function CancellationCard({ cancellation }: { cancellation: NonNullable<AdminBookingDetailModel["cancellation"]> }) {
  return (
    <Card className="rounded-md border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>Cancellation case is attached</CardTitle>
        <CardDescription>Current internal status: {humanize(cancellation.status)} · updated {cancellation.updatedAtLabel}</CardDescription>
        <CardAction><Button variant="outline" nativeButton={false} render={<Link href={`/admin/cancellations/${cancellation.requestId}`} />}>Open case<ChevronRightIcon data-icon="inline-end" /></Button></CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <DetailBlock label="Customer reason" value={cancellation.customerReason} />
        <DetailBlock label="Refund amount" value={cancellation.refundAmountLabel ?? "Not confirmed"} />
        <DetailBlock label="Customer message" value={cancellation.customerMessage ?? "No message saved"} />
      </CardContent>
    </Card>
  )
}

function StatusBadge({ tone, label }: { tone: AdminBookingDetailModel["operationalStatus"]["tone"]; label: string }) {
  return <Badge variant={tone === "cancelled" ? "destructive" : tone === "active" ? "default" : "secondary"} className={cn(tone === "attention" && "ring-1 ring-border")}>{label}</Badge>
}

function JourneyPoint({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted/60 p-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-start justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className={cn("max-w-[60%] text-right", strong && "font-semibold")}>{value}</span></div>
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>
}

function Identifier({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><code className="mt-1 block break-all rounded bg-muted px-2 py-1.5 text-xs">{value}</code></div>
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase())
}
