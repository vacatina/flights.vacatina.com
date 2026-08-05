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
import { MaterialIcon } from "@/components/ui/material-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { PendingSubmitButton } from "@/modules/flights/cancellations/ui/pending-submit-button"

interface AdminCancellationDetailProps {
  detail: AdminCancellationDetailModel
}

export function AdminCancellationDetail({
  detail,
}: AdminCancellationDetailProps) {
  const status = detail.request.status
  const isTerminal = ["completed", "rejected"].includes(status)
  const isDuffelAvailable = detail.request.duffelApiAvailable

  const canCreateQuote = [
    "requested",
    "quote_pending",
    "quote_ready",
    "admin_review_required",
    "manual_processing",
    "failed",
  ].includes(status)
  const canApproveCancellation = [
    "requested",
    "quote_pending",
    "quote_ready",
    "admin_review_required",
  ].includes(status)
  const canMoveToManual = [
    "requested",
    "quote_pending",
    "quote_ready",
    "admin_review_required",
    "duffel_confirming",
    "refund_pending",
    "failed",
  ].includes(status)
  const canApproveRefund = [
    "duffel_cancelled",
    "manual_processing",
    "refund_pending",
  ].includes(status)
  const canMarkRefundComplete = [
    "duffel_cancelled",
    "manual_processing",
    "refund_pending",
  ].includes(status)
  const canReject = !isTerminal

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="space-y-2">
          <Button
            size="sm"
            variant="ghost"
            className="-ml-2 text-[#596273]"
            render={<Link href="/admin/cancellations" />}
          >
            <MaterialIcon name="arrow_back" className="text-[18px]" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-[#111827] md:text-3xl">
            {detail.booking.reference}
          </h1>
          <p className="text-sm text-muted-foreground">
            {detail.booking.routeLabel} · {detail.booking.customerEmail}
          </p>
        </div>
        <Badge variant="secondary" className="bg-[#eef3ff] text-[#1749d8]">
          {detail.request.statusLabel}
        </Badge>
      </div>

      {/* Duffel Status Banner */}
      <DuffelStatusCard apiAvailable={isDuffelAvailable} />

      {/* Booking Summary */}
      <InfoGrid
        items={[
          ["Airline", detail.booking.airlineName],
          ["Departure", detail.booking.departureLabel],
          ["Duffel order", detail.booking.duffelOrderId],
          ["Order value", detail.booking.sellAmountLabel],
          [
            "Duffel API",
            isDuffelAvailable === null
              ? "Unchecked / Unknown"
              : isDuffelAvailable
                ? "Available (API Enabled)"
                : "Unavailable (Manual Required)",
          ],
          ["Capture ID", detail.payment.providerCaptureId ?? "Not available"],
        ]}
      />

      {/* Actions Card (Integrated into main flow) */}
      <section className="space-y-5 rounded-lg border border-border bg-background p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold">Cancellation Actions</h2>
            <p className="text-xs text-muted-foreground">
              Current workflow state:{" "}
              <span className="font-semibold text-foreground">
                {detail.request.statusLabel}
              </span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionForm
            action={createDuffelCancellationQuoteFormAction}
            requestId={detail.request.id}
            label="Create / refresh Duffel quote"
            variant="outline"
            disabled={!canCreateQuote}
            helperText={
              isDuffelAvailable === false
                ? "Queries Duffel API to re-check API availability."
                : "Fetches live cancellation quotes from Duffel API."
            }
          />

          <ActionForm
            action={approveCancellationFormAction}
            requestId={detail.request.id}
            label="Approve cancellation"
            variant={canApproveCancellation ? "default" : "outline"}
            disabled={!canApproveCancellation}
            helperText={
              isDuffelAvailable === false
                ? "Approves request and routes to manual support processing."
                : "Confirms Duffel quote with airline and advances to refund review."
            }
          />

          <ActionForm
            action={moveManualProcessingFormAction}
            requestId={detail.request.id}
            label="Move to manual processing"
            variant="outline"
            disabled={!canMoveToManual}
            helperText="Forces request into manual processing mode for support team handling."
          />

          <ActionForm
            action={approveRefundFormAction}
            requestId={detail.request.id}
            label="Approve refund"
            variant={canApproveRefund ? "default" : "secondary"}
            disabled={!canApproveRefund}
            helperText={
              detail.payment.providerCaptureId
                ? "Triggers automated PayPal refund to customer's account."
                : "Approves refund for manual processing."
            }
          />

          <ActionForm
            action={markManualRefundCompletedFormAction}
            requestId={detail.request.id}
            label="Mark manual refund complete"
            variant="secondary"
            disabled={!canMarkRefundComplete}
            helperText="Marks refund as manually completed when processed outside automated API."
          />
        </div>

        <Separator className="my-3" />

        {/* Rejection Form */}
        <form
          action={rejectCancellationFormAction}
          className="max-w-2xl space-y-3"
        >
          <input type="hidden" name="requestId" value={detail.request.id} />
          <Label className="text-sm font-semibold">
            Reject cancellation request
          </Label>
          <Textarea
            name="reason"
            placeholder="Rejection reason shown to the customer"
            required
            disabled={!canReject}
            className="min-h-20 text-sm"
          />
          <div className="flex items-center gap-3">
            <PendingSubmitButton
              variant="destructive"
              pendingLabel="Rejecting..."
              disabled={!canReject}
            >
              Reject request
            </PendingSubmitButton>
            {!canReject && (
              <span className="text-xs text-muted-foreground">
                This request is in a terminal state (
                {detail.request.statusLabel}) and cannot be rejected.
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Customer Request */}
      <section className="space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Customer request</h2>
        <p className="text-sm text-muted-foreground">
          {detail.request.customerReason}
        </p>
        {detail.request.adminRejectionReason ? (
          <p className="text-sm font-medium text-destructive">
            Rejection reason: {detail.request.adminRejectionReason}
          </p>
        ) : null}
      </section>

      {/* Fare conditions */}
      <section className="space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Fare conditions</h2>
        {detail.booking.fareConditions.map((condition) => (
          <p key={condition} className="text-sm text-muted-foreground">
            {condition}
          </p>
        ))}
      </section>

      {/* Fee and refund */}
      <section className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Fee and refund</h2>
        <form
          action={updateCancellationFeeRefundFormAction}
          className="grid gap-4 md:grid-cols-4"
        >
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
            [
              "Service fee",
              formatMoney(
                detail.request.adminFeeAmount,
                detail.booking.currency
              ),
            ],
            [
              "Customer refund",
              detail.request.customerRefundAmount === null
                ? "Not set"
                : formatMoney(
                    detail.request.customerRefundAmount,
                    detail.request.customerRefundCurrency ??
                      detail.booking.currency
                  ),
            ],
            [
              "Payment captured",
              formatMoney(
                detail.payment.capturedAmount,
                detail.payment.currency
              ),
            ],
            [
              "Refund approval",
              detail.request.refundApprovedAtLabel ?? "Pending",
            ],
          ]}
        />
      </section>

      {/* Customer message */}
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

      {/* Timing override */}
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

      {/* Duffel cancellation quotes */}
      <section className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Duffel cancellation quotes</h2>
        {detail.quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Duffel quote stored yet.
          </p>
        ) : null}
        {detail.quotes.map((quote) => (
          <div
            key={quote.id}
            className="space-y-1 rounded-md border border-border p-3"
          >
            <p className="text-sm font-medium">{quote.refundLabel}</p>
            <p className="text-xs text-muted-foreground">
              {quote.duffelOrderCancellationId} · {quote.refundTo}
            </p>
            <p className="text-xs text-muted-foreground">
              Expires {quote.expiresAtLabel}
              {quote.confirmedAtLabel
                ? ` · Confirmed ${quote.confirmedAtLabel}`
                : ""}
            </p>
          </div>
        ))}
      </section>

      {/* Refund attempts */}
      <section className="space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Refund attempts</h2>
        {detail.refunds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No refund records yet.
          </p>
        ) : null}
        {detail.refunds.map((refund) => (
          <div
            key={refund.id}
            className="space-y-1 rounded-md border border-border p-3"
          >
            <p className="text-sm font-medium">{refund.amountLabel}</p>
            <p className="text-xs text-muted-foreground">
              Status:{" "}
              <span className="font-semibold text-foreground">
                {refund.status}
              </span>{" "}
              · {refund.createdAtLabel}
            </p>
          </div>
        ))}
      </section>

      {/* Audit trail */}
      <section className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Audit trail</h2>
        <div className="space-y-3">
          {detail.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : null}
          {detail.events.map((event) => (
            <div
              key={event.id}
              className="space-y-1 border-b border-border pb-3 last:border-0"
            >
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
    </div>
  )
}

function DuffelStatusCard({ apiAvailable }: { apiAvailable: boolean | null }) {
  if (apiAvailable === true) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-200">
        <MaterialIcon
          name="check_circle"
          filled
          className="mt-0.5 shrink-0 text-[21px] text-emerald-600"
        />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              Duffel API Cancellation Available
            </span>
            <Badge className="bg-emerald-600 text-[10px] text-white uppercase hover:bg-emerald-600">
              API Supported
            </Badge>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            This booking order can be automatically quoted and cancelled
            directly via the Duffel API.
          </p>
        </div>
      </div>
    )
  }

  if (apiAvailable === false) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200">
        <MaterialIcon
          name="warning"
          filled
          className="mt-0.5 shrink-0 text-[21px] text-amber-600"
        />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              Manual Airline Processing Required
            </span>
            <Badge
              variant="outline"
              className="border-amber-600 text-[10px] font-semibold text-amber-700 uppercase dark:text-amber-300"
            >
              API Unavailable
            </Badge>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Automated Duffel API cancellation is not supported for this
            ticket/airline. Support must process cancellation manually via the
            airline portal or Duffel dashboard, then approve manual refund.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-blue-950 dark:text-blue-200">
      <MaterialIcon
        name="help"
        filled
        className="mt-0.5 shrink-0 text-[21px] text-blue-600"
      />
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">
            Duffel API Status Unchecked
          </span>
          <Badge variant="secondary" className="text-[10px] uppercase">
            Unknown
          </Badge>
        </div>
        <p className="text-xs text-blue-800 dark:text-blue-300">
          Select <strong>Create / refresh Duffel quote</strong> in the action
          panel to verify live Duffel API cancellation capability for this
          booking.
        </p>
      </div>
    </div>
  )
}

function ActionForm({
  action,
  requestId,
  label,
  variant = "default",
  disabled = false,
  helperText,
}: {
  action: (formData: FormData) => Promise<void>
  requestId: string
  label: string
  variant?: "default" | "outline" | "secondary"
  disabled?: boolean
  helperText?: string
}) {
  return (
    <div className="space-y-1">
      <form action={action}>
        <input type="hidden" name="requestId" value={requestId} />
        <PendingSubmitButton
          variant={variant}
          className="w-full"
          pendingLabel="Working..."
          disabled={disabled}
        >
          {label}
        </PendingSubmitButton>
      </form>
      {helperText && (
        <p className="px-1 text-[11px] text-muted-foreground">{helperText}</p>
      )}
    </div>
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
    <div className="grid gap-5 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:grid-cols-2 md:p-6">
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
