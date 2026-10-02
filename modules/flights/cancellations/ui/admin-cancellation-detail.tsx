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
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"

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
  const hasPayPalCapture = Boolean(detail.payment.providerCaptureId)
  const refundActionLabel = hasPayPalCapture
    ? "Refund via PayPal"
    : "Approve manual refund"
  const refundHelperText = hasPayPalCapture
    ? "Sends the calculated refund to the original PayPal payment."
    : "No PayPal capture ID is available. Support must complete this refund manually."

  return (
    <div className="w-full mx-auto max-w-screen-2xl space-y-5">
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
      <section className="space-y-5 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8ebf0] pb-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-[#1749d8] uppercase">
              Next step
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#172033]">
              Cancellation actions
            </h2>
            <p className="mt-1 text-sm text-[#667085]">
              Choose the action that matches the current workflow state.
            </p>
          </div>
          <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-semibold text-[#596273]">
            {detail.request.statusLabel}
          </span>
        </div>

        {canApproveCancellation ? (
          <div className="flex items-start gap-3 rounded-md border border-[#cbd9ff] bg-[#f5f8ff] p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1749d8] text-white">
              <MaterialIcon name="task_alt" filled className="text-[20px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#172033]">
                Ready for your decision
              </p>
              <p className="mt-0.5 text-sm leading-5 text-[#596273]">
                Review the booking details above, then approve the cancellation
                to continue.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionForm
            action={createDuffelCancellationQuoteFormAction}
            requestId={detail.request.id}
            label="Create / refresh Duffel quote"
            icon="refresh"
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
            icon="check_circle"
            featured={canApproveCancellation}
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
            icon="support_agent"
            variant="outline"
            disabled={!canMoveToManual}
            helperText="Forces request into manual processing mode for support team handling."
          />

          <ActionForm
            action={approveRefundFormAction}
            requestId={detail.request.id}
            label={refundActionLabel}
            icon="payments"
            variant={canApproveRefund ? "default" : "secondary"}
            disabled={!canApproveRefund}
            helperText={refundHelperText}
          />

          <ActionForm
            action={markManualRefundCompletedFormAction}
            requestId={detail.request.id}
            label="Mark manual refund complete"
            icon="task_alt"
            variant="secondary"
            disabled={!canMarkRefundComplete}
            helperText="Use after support confirms the customer received the manual refund."
          />
        </div>

        <Separator className="my-2" />

        {/* Rejection Form */}
        <div className="rounded-md border border-[#f3d2d0] bg-[#fff8f7] p-4">
          <div className="mb-3 flex items-start gap-3">
            <MaterialIcon
              name="block"
              className="mt-0.5 text-[20px] text-[#b42318]"
            />
            <div>
              <Label className="text-sm font-semibold text-[#8f1d16]">
                Reject this request
              </Label>
              <p className="mt-0.5 text-xs text-[#a04b44]">
                Use only when the cancellation cannot be accepted.
              </p>
            </div>
          </div>
          <form
            action={rejectCancellationFormAction}
            className="max-w-2xl space-y-3"
          >
            <input type="hidden" name="requestId" value={detail.request.id} />
            <Textarea
              name="reason"
              placeholder="Explain the reason shown to the customer"
              required
              disabled={!canReject}
              className="min-h-20 border-[#e8c8c5] bg-white text-sm"
            />
            <div className="flex flex-wrap items-center gap-3">
              <PendingSubmitButton
                size="lg"
                variant="destructive"
                pendingLabel="Rejecting..."
                disabled={!canReject}
              >
                <MaterialIcon name="block" className="text-[18px]" />
                Reject request
              </PendingSubmitButton>
              {!canReject && (
                <span className="text-xs text-[#a04b44]">
                  This request is already{" "}
                  {detail.request.statusLabel.toLowerCase()}.
                </span>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Customer Request */}
      <section className="space-y-3 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <MaterialIcon name="person" className="text-[20px] text-[#1749d8]" />
          <h2 className="text-lg font-semibold text-[#172033]">
            Customer request
          </h2>
        </div>
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
      <section className="space-y-3 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <MaterialIcon
            name="description"
            className="text-[20px] text-[#1749d8]"
          />
          <h2 className="text-lg font-semibold text-[#172033]">
            Fare conditions
          </h2>
        </div>
        {detail.booking.fareConditions.map((condition) => (
          <p key={condition} className="text-sm text-muted-foreground">
            {condition}
          </p>
        ))}
      </section>

      {/* Fee and refund */}
      <section className="space-y-4 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <MaterialIcon
            name="payments"
            className="text-[20px] text-[#1749d8]"
          />
          <h2 className="text-lg font-semibold text-[#172033]">
            Fee and refund
          </h2>
        </div>
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
            <PendingSubmitButton size="lg" pendingLabel="Updating...">
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
      <section className="space-y-4 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <MaterialIcon name="mail" className="text-[20px] text-[#1749d8]" />
          <h2 className="text-lg font-semibold text-[#172033]">
            Customer message
          </h2>
        </div>
        <form action={updateCustomerMessageFormAction} className="space-y-3">
          <input type="hidden" name="requestId" value={detail.request.id} />
          <Textarea
            name="message"
            defaultValue={detail.request.customerMessage ?? ""}
            className="min-h-28"
          />
          <PendingSubmitButton size="lg" pendingLabel="Saving...">
            Save message
          </PendingSubmitButton>
        </form>
      </section>

      {/* Timing override */}
      <section className="space-y-4 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <MaterialIcon
            name="schedule"
            className="text-[20px] text-[#1749d8]"
          />
          <h2 className="text-lg font-semibold text-[#172033]">
            Timing override
          </h2>
        </div>
        {detail.request.cutoffOverrideReason ? (
          <p className="text-sm text-muted-foreground">
            {detail.request.cutoffOverrideReason}
          </p>
        ) : null}
        <form action={recordCutoffOverrideFormAction} className="space-y-3">
          <input type="hidden" name="requestId" value={detail.request.id} />
          <Input name="reason" placeholder="Reason for timing override" />
          <PendingSubmitButton
            size="lg"
            variant="outline"
            pendingLabel="Recording..."
          >
            Record override
          </PendingSubmitButton>
        </form>
      </section>

      {/* Duffel cancellation quotes */}
      <section className="space-y-4 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <MaterialIcon
            name="request_quote"
            className="text-[20px] text-[#1749d8]"
          />
          <h2 className="text-lg font-semibold text-[#172033]">
            Duffel cancellation quotes
          </h2>
        </div>
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
      <section className="space-y-3 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <MaterialIcon
            name="currency_exchange"
            className="text-[20px] text-[#1749d8]"
          />
          <h2 className="text-lg font-semibold text-[#172033]">
            Refund attempts
          </h2>
        </div>
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
      <section className="space-y-4 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <MaterialIcon name="history" className="text-[20px] text-[#1749d8]" />
          <h2 className="text-lg font-semibold text-[#172033]">Audit trail</h2>
        </div>
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
  icon,
  featured = false,
  variant = "default",
  disabled = false,
  helperText,
}: {
  action: (formData: FormData) => Promise<void>
  requestId: string
  label: string
  icon: string
  featured?: boolean
  variant?: "default" | "outline" | "secondary"
  disabled?: boolean
  helperText?: string
}) {
  return (
    <div className="space-y-1">
      <form action={action}>
        <input type="hidden" name="requestId" value={requestId} />
        <PendingSubmitButton
          size="lg"
          variant={variant}
          className={
            featured
              ? "h-12 w-full bg-[#1749d8] text-white hover:bg-[#123fc0]"
              : "h-12 w-full"
          }
          pendingLabel="Working..."
          disabled={disabled}
        >
          <MaterialIcon name={icon} filled={featured} className="text-[19px]" />
          <span>{label}</span>
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
    <div className="grid gap-x-8 gap-y-5 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:grid-cols-3 md:p-6">
      {items.map(([label, value]) => (
        <div key={label} className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-[#7b8492] uppercase">
            {label}
          </p>
          <p className="text-sm font-semibold break-words text-[#172033]">
            {value}
          </p>
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
