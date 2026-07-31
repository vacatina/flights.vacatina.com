import Link from "next/link"

import type { AdminCancellationDetailModel } from "@/modules/flights/cancellations/server/service"
import {
  approveCancellationFormAction,
  approveRefundFormAction,
  createDuffelCancellationQuoteFormAction,
  markManualRefundCompletedFormAction,
  moveManualProcessingFormAction,
  recordCutoffOverrideFormAction,
  rejectCancellationFormAction,
  updateCancellationFeeRefundFormAction,
  updateCustomerMessageFormAction,
} from "@/modules/flights/cancellations/server/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { PendingSubmitButton } from "@/modules/flights/cancellations/ui/pending-submit-button"

interface AdminCancellationDetailProps {
  detail: AdminCancellationDetailModel
}

export function AdminCancellationDetail({
  detail,
}: AdminCancellationDetailProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-background p-5 shadow-sm">
          <div className="space-y-2">
            <Button variant="ghost" render={<Link href="/admin/cancellations" />}>
              Back
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {detail.booking.reference}
            </h1>
            <p className="text-sm text-muted-foreground">
              {detail.booking.routeLabel} · {detail.booking.customerEmail}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {detail.request.statusLabel}
          </Badge>
        </div>

        <InfoGrid
          items={[
            ["Airline", detail.booking.airlineName],
            ["Departure", detail.booking.departureLabel],
            ["Duffel order", detail.booking.duffelOrderId],
            ["Order value", detail.booking.sellAmountLabel],
            [
              "Duffel API",
              detail.request.duffelApiAvailable === null
                ? "Unknown"
                : detail.request.duffelApiAvailable
                  ? "Available"
                  : "Unavailable",
            ],
            ["Capture ID", detail.payment.providerCaptureId ?? "Not available"],
          ]}
        />

        <section className="space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Customer request</h2>
          <p className="text-sm text-muted-foreground">
            {detail.request.customerReason}
          </p>
          {detail.request.adminRejectionReason ? (
            <p className="text-sm text-destructive">
              Rejection: {detail.request.adminRejectionReason}
            </p>
          ) : null}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Fare conditions</h2>
          {detail.booking.fareConditions.map((condition) => (
            <p key={condition} className="text-sm text-muted-foreground">
              {condition}
            </p>
          ))}
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Fee and refund</h2>
          <form action={updateCancellationFeeRefundFormAction} className="grid gap-4 md:grid-cols-4">
            <input type="hidden" name="requestId" value={detail.request.id} />
            <div className="space-y-2">
              <Label htmlFor="feeType">Fee type</Label>
              <Select name="feeType" defaultValue={detail.request.adminFeeType}>
                <SelectTrigger id="feeType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="percent">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field
              label="Fee value"
              name="feeValue"
              defaultValue={String(detail.request.adminFeeValue)}
            />
            <Field
              label="Airline refund"
              name="airlineRefundAmount"
              defaultValue={String(
                detail.request.customerRefundAmount ?? detail.booking.sellAmount
              )}
            />
            <Field
              label="Currency"
              name="customerRefundCurrency"
              defaultValue={
                detail.request.customerRefundCurrency ?? detail.booking.currency
              }
            />
            <div className="md:col-span-4">
              <PendingSubmitButton pendingLabel="Updating...">
                Update fee/refund
              </PendingSubmitButton>
            </div>
          </form>
          <InfoGrid
            items={[
              ["Service fee", formatMoney(detail.request.adminFeeAmount, detail.booking.currency)],
              [
                "Customer refund",
                detail.request.customerRefundAmount === null
                  ? "Not set"
                  : formatMoney(
                      detail.request.customerRefundAmount,
                      detail.request.customerRefundCurrency ?? detail.booking.currency
                    ),
              ],
              ["Payment captured", formatMoney(detail.payment.capturedAmount, detail.payment.currency)],
              ["Refund approval", detail.request.refundApprovedAtLabel ?? "Pending"],
            ]}
          />
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Customer message</h2>
          <form action={updateCustomerMessageFormAction} className="space-y-3">
            <input type="hidden" name="requestId" value={detail.request.id} />
            <Textarea
              name="message"
              defaultValue={detail.request.customerMessage ?? ""}
              className="min-h-28"
            />
            <PendingSubmitButton pendingLabel="Saving...">
              Save message
            </PendingSubmitButton>
          </form>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Timing override</h2>
          {detail.request.cutoffOverrideReason ? (
            <p className="text-sm text-muted-foreground">
              {detail.request.cutoffOverrideReason}
            </p>
          ) : null}
          <form action={recordCutoffOverrideFormAction} className="space-y-3">
            <input type="hidden" name="requestId" value={detail.request.id} />
            <Input name="reason" placeholder="Reason for timing override" />
            <PendingSubmitButton variant="outline" pendingLabel="Recording...">
              Record override
            </PendingSubmitButton>
          </form>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Duffel cancellation quotes</h2>
          {detail.quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Duffel quote stored yet.</p>
          ) : null}
          {detail.quotes.map((quote) => (
            <div key={quote.id} className="space-y-1 rounded-md border border-border p-3">
              <p className="text-sm font-medium">{quote.refundLabel}</p>
              <p className="text-xs text-muted-foreground">
                {quote.duffelOrderCancellationId} · {quote.refundTo}
              </p>
              <p className="text-xs text-muted-foreground">
                Expires {quote.expiresAtLabel}
                {quote.confirmedAtLabel ? ` · Confirmed ${quote.confirmedAtLabel}` : ""}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Audit trail</h2>
          <div className="space-y-3">
            {detail.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : null}
            {detail.events.map((event) => (
              <div key={event.id} className="space-y-1 border-b border-border pb-3 last:border-0">
                <p className="text-sm font-medium text-foreground">
                  {event.eventType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {event.actorType} · {event.createdAtLabel}
                </p>
                {event.message ? (
                  <p className="text-sm text-muted-foreground">{event.message}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="space-y-4">
        <section className="space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Actions</h2>
          <ActionForm
            action={createDuffelCancellationQuoteFormAction}
            requestId={detail.request.id}
            label="Create/refresh Duffel quote"
            variant="outline"
          />
          <ActionForm
            action={approveCancellationFormAction}
            requestId={detail.request.id}
            label="Approve cancellation"
          />
          <ActionForm
            action={moveManualProcessingFormAction}
            requestId={detail.request.id}
            label="Move to manual processing"
            variant="outline"
          />
          <ActionForm
            action={approveRefundFormAction}
            requestId={detail.request.id}
            label="Approve refund"
            variant="secondary"
          />
          <ActionForm
            action={markManualRefundCompletedFormAction}
            requestId={detail.request.id}
            label="Mark manual refund complete"
            variant="secondary"
          />
          <Separator />
          <form action={rejectCancellationFormAction} className="space-y-3">
            <input type="hidden" name="requestId" value={detail.request.id} />
            <Textarea
              name="reason"
              placeholder="Rejection reason shown to the customer"
              required
              className="min-h-24"
            />
            <PendingSubmitButton
              variant="destructive"
              className="w-full"
              pendingLabel="Rejecting..."
            >
              Reject request
            </PendingSubmitButton>
          </form>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Refund attempts</h2>
          {detail.refunds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No refund records yet.</p>
          ) : null}
          {detail.refunds.map((refund) => (
            <div key={refund.id} className="space-y-1">
              <p className="text-sm font-medium">{refund.amountLabel}</p>
              <p className="text-xs text-muted-foreground">
                {refund.status} · {refund.createdAtLabel}
              </p>
            </div>
          ))}
        </section>
      </aside>
    </div>
  )
}

function ActionForm({
  action,
  requestId,
  label,
  variant = "default",
}: {
  action: (formData: FormData) => Promise<void>
  requestId: string
  label: string
  variant?: "default" | "outline" | "secondary"
}) {
  return (
    <form action={action}>
      <input type="hidden" name="requestId" value={requestId} />
      <PendingSubmitButton
        variant={variant}
        className="w-full"
        pendingLabel="Working..."
      >
        {label}
      </PendingSubmitButton>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  )
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-4 rounded-lg border border-border bg-background p-5 shadow-sm md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="space-y-1">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
      ))}
    </div>
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
