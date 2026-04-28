import type { BookingDetailModel } from "@/modules/flights/orders/domain"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function BookingDetailView({ detail }: { detail: BookingDetailModel }) {
  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Booking {detail.bookingReference}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Status: <strong className="text-foreground">{detail.statusLabel}</strong>
          </p>
          <p>
            Payment mode: <strong className="text-foreground">{detail.paymentMode}</strong>
          </p>
          <p>
            Duffel order ID: <strong className="text-foreground">{detail.duffelOrderId}</strong>
          </p>
          <p>
            Contact email: <strong className="text-foreground">{detail.contactEmail}</strong>
          </p>
          <p>
            Created at: <strong className="text-foreground">{detail.createdAtLabel}</strong>
          </p>
          {detail.paymentRequiredByLabel ? (
            <p>
              Payment required by:{" "}
              <strong className="text-foreground">{detail.paymentRequiredByLabel}</strong>
            </p>
          ) : null}
          {detail.priceGuaranteeExpiresAtLabel ? (
            <p>
              Price guarantee until:{" "}
              <strong className="text-foreground">{detail.priceGuaranteeExpiresAtLabel}</strong>
            </p>
          ) : null}
          {detail.paidAtLabel ? (
            <p>
              Paid at: <strong className="text-foreground">{detail.paidAtLabel}</strong>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Trip summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              {detail.snapshot.journeyTypeLabel} · {detail.snapshot.routeLabel}
            </p>
            <p>
              {detail.snapshot.passengerCount} passenger
              {detail.snapshot.passengerCount > 1 ? "s" : ""} · {detail.snapshot.cabinClassLabel}
            </p>
            <p className="text-base font-semibold text-foreground">
              Total: {detail.snapshot.sellAmountLabel}
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            {detail.snapshot.legs.map((leg) => (
              <div key={`${leg.legIndex}-${leg.departureAtIso ?? "unknown"}`} className="space-y-2">
                <p className="text-sm font-semibold">{leg.title}</p>
                <p className="text-sm text-muted-foreground">
                  {leg.ownerName} · {leg.routeLabel}
                </p>
                <p className="text-sm">
                  <strong>{leg.departureLabel}</strong> → <strong>{leg.arrivalLabel}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  {leg.durationLabel} · {leg.stopsLabel}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
