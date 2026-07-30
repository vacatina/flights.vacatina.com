import Link from "next/link"
import { AlertTriangleIcon, LifeBuoyIcon, PlaneIcon, UsersIcon } from "lucide-react"

import type { CancellationEligibilityContext } from "@/modules/flights/cancellations/server/service"
import { createCancellationRequestFormAction } from "@/modules/flights/cancellations/server/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

interface CancellationRequestViewProps {
  context: CancellationEligibilityContext
  submitted?: boolean
  error?: string
}

export function CancellationRequestView({
  context,
  submitted = false,
  error,
}: CancellationRequestViewProps) {
  const firstLeg = context.snapshot.legs[0] ?? null
  const existing = context.existingRequest

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              Full booking only
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              Review within 24 hours
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Cancel booking {context.booking.bookingReference}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your request is subject to admin approval and airline fare rules.
            We will track any service fee and refund internally before a refund
            is completed.
          </p>
        </header>

        {submitted || existing ? (
          <section className="space-y-4 rounded-lg border border-border p-5">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="mt-1 size-5 text-muted-foreground" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Current request
                </h2>
                <p className="text-sm text-muted-foreground">
                  Status:{" "}
                  <span className="font-medium text-foreground">
                    {existing?.statusLabel ?? "Submitted"}
                  </span>
                </p>
                {existing?.customerMessage ? (
                  <p className="text-sm text-muted-foreground">
                    {existing.customerMessage}
                  </p>
                ) : null}
                {existing?.customerRefundAmount !== null &&
                existing?.customerRefundAmount !== undefined ? (
                  <p className="text-sm text-muted-foreground">
                    Refund under review:{" "}
                    {formatMoney(
                      existing.customerRefundAmount,
                      existing.customerRefundCurrency ?? context.currency
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <PlaneIcon className="size-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold tracking-tight">
              Flight summary
            </h2>
          </div>
          <div className="grid gap-4 rounded-lg border border-border p-5 md:grid-cols-2">
            <SummaryItem label="Route" value={context.snapshot.routeLabel} />
            <SummaryItem
              label="Airline"
              value={firstLeg?.ownerName ?? "Airline unavailable"}
            />
            <SummaryItem
              label="Departure"
              value={firstLeg?.departureLabel ?? "Departure unavailable"}
            />
            <SummaryItem
              label="Booking value"
              value={context.booking.sellAmount.toFixed(2) + ` ${context.currency}`}
            />
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <UsersIcon className="size-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold tracking-tight">
              Passengers
            </h2>
          </div>
          <div className="grid gap-3">
            {(context.snapshot.passengers.length > 0
              ? context.snapshot.passengers
              : [{ id: "passenger", label: "Passenger", fullName: null }]
            ).map((passenger) => (
              <div
                key={passenger.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {passenger.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {passenger.fullName ?? "Name unavailable"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border p-5">
          <h2 className="text-xl font-semibold tracking-tight">
            Fare and refund conditions
          </h2>
          <p className="text-sm text-muted-foreground">
            {context.snapshot.conditions.changes}
          </p>
          <p className="text-sm text-muted-foreground">
            {context.snapshot.conditions.refunds}
          </p>
        </section>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!existing ? (
          <form action={createCancellationRequestFormAction} className="space-y-4">
            <input
              type="hidden"
              name="bookingReference"
              value={context.booking.bookingReference}
            />
            <Textarea
              name="customerReason"
              minLength={10}
              maxLength={2000}
              required
              placeholder="Tell us why you need to cancel this booking."
              className="min-h-36"
              disabled={!context.canSubmit}
            />
            {context.blockedReason ? (
              <p className="text-sm text-muted-foreground">
                {context.blockedReason}
                {context.cooldownEndsAt
                  ? ` You can submit again after ${context.cooldownEndsAt.toLocaleString()}.`
                  : ""}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={!context.canSubmit}>
                Submit request
              </Button>
              <Button
                type="button"
                variant="outline"
                render={
                  <Link
                    href={`/booking/${encodeURIComponent(context.booking.bookingReference)}`}
                  />
                }
              >
                Back to booking
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      <aside className="space-y-5 border-l border-border pl-6">
        <div className="space-y-3 rounded-lg border border-border p-5">
          <h2 className="text-lg font-semibold">Estimate</h2>
          <SummaryItem
            label="Service fee"
            value={formatMoney(context.estimatedFeeAmount, context.currency)}
          />
          <SummaryItem
            label="Customer refund"
            value={formatMoney(context.estimatedRefundAmount, context.currency)}
          />
          <Separator />
          <p className="text-xs text-muted-foreground">
            Final refund depends on admin approval and airline rules. Real
            provider refunds are not sent in this internal workflow.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-5">
          <div className="flex items-center gap-2">
            <LifeBuoyIcon className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Support</h2>
          </div>
          <SupportLine label="Business" value={context.businessSettings.businessName} />
          <SupportLine label="Email" value={context.businessSettings.supportEmail} />
          <SupportLine label="Phone" value={context.businessSettings.supportPhone} />
          <SupportLine label="WhatsApp" value={context.businessSettings.supportWhatsapp} />
          <SupportLine label="Timezone" value={context.businessSettings.timezone} />
          {context.manualSupportCase ? (
            <p className="text-sm text-muted-foreground">
              This booking may require manual support review.
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function SupportLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{label}:</span> {value}
    </p>
  )
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
