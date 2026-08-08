import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  Clock3Icon,
  CreditCardIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  WebhookIcon,
  WorkflowIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { OriginalDecimalMoney } from "@/modules/currency/ui"
import { reconcileAdminPaymentFormAction } from "@/modules/payments/server/actions"
import type { AdminPaymentDetailModel } from "@/modules/payments/server/admin-service"
import { ReconcilePaymentButton } from "@/modules/payments/ui/reconcile-payment-button"

interface AdminPaymentDetailProps {
  detail: AdminPaymentDetailModel
  error?: string | null
  reconciled?: boolean
}

export function AdminPaymentDetail({
  detail,
  error,
  reconciled = false,
}: AdminPaymentDetailProps) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="rounded-md">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit px-0 hover:bg-transparent"
                nativeButton={false}
                render={<Link href="/admin/payments" />}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                All payments
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="font-mono text-lg md:text-xl">
                  {detail.payment.id}
                </CardTitle>
                <PaymentBadge detail={detail} />
              </div>
              <CardDescription className="max-w-2xl">
                {detail.payment.statusDescription}
              </CardDescription>
            </div>
            {detail.payment.canReconcile ? (
              <form action={reconcileAdminPaymentFormAction}>
                <input
                  type="hidden"
                  name="paymentAttemptId"
                  value={detail.payment.id}
                />
                <ReconcilePaymentButton />
              </form>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailMetric
            icon={CircleDollarSignIcon}
            label="Payment amount"
            value={
              <OriginalDecimalMoney
                value={detail.payment.amount}
                currency={detail.payment.currency}
              />
            }
            note="Authoritative checkout currency"
          />
          <DetailMetric
            icon={CreditCardIcon}
            label="Provider"
            value={detail.payment.provider}
            note={detail.payment.providerStatus ?? "No provider status"}
          />
          <DetailMetric
            icon={WorkflowIcon}
            label="Booking"
            value={detail.booking?.bookingReference ?? "Not fulfilled"}
            note={detail.booking?.routeLabel ?? "Checkout payment only"}
          />
          <DetailMetric
            icon={Clock3Icon}
            label="Last updated"
            value={detail.payment.updatedAtLabel}
            note={`Created ${detail.payment.createdAtLabel}`}
          />
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Provider check failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {reconciled ? (
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>Provider status checked</AlertTitle>
          <AlertDescription>
            The latest PayPal state has been compared with this payment record.
          </AlertDescription>
        </Alert>
      ) : null}

      {detail.payment.failureMessage ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>
            {detail.payment.failureCode ?? "Payment needs attention"}
          </AlertTitle>
          <AlertDescription>
            {detail.payment.failureMessage}
            {detail.payment.nextReconciliationAtLabel
              ? ` Next automatic check: ${detail.payment.nextReconciliationAtLabel}.`
              : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
        <Card className="rounded-md">
          <CardHeader className="border-b">
            <CardTitle>Payment timeline</CardTitle>
            <CardDescription>
              Provider, webhook, fulfillment, and reconciliation events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detail.events.length === 0 ? (
              <Empty className="border-0 py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Clock3Icon />
                  </EmptyMedia>
                  <EmptyTitle>No payment events</EmptyTitle>
                  <EmptyDescription>
                    Events will appear as the provider lifecycle progresses.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col">
                {detail.events.map((event, index) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-[28px_minmax(0,1fr)] gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "mt-1 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground",
                          event.eventType === "CAPTURE_COMPLETED" &&
                            "bg-primary/10 text-primary",
                          [
                            "FULFILLMENT_FAILED",
                            "RECONCILIATION_REQUIRED",
                            "REVERSAL_DETECTED",
                            "DISPUTE_DETECTED",
                          ].includes(event.eventType) &&
                            "bg-destructive/10 text-destructive"
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                      </span>
                      {index < detail.events.length - 1 ? (
                        <span className="min-h-8 w-px flex-1 bg-border" />
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1 pb-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.createdAtLabel}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                      {event.amount !== null && event.currency ? (
                        <p className="text-sm font-medium tabular-nums">
                          <OriginalDecimalMoney
                            value={event.amount}
                            currency={event.currency}
                          />
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader className="border-b">
            <CardTitle>Provider record</CardTitle>
            <CardDescription>
              Identifiers used for support and reconciliation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Identifier label="Payment attempt" value={detail.payment.id} />
            <Separator />
            <Identifier
              label="PayPal order"
              value={detail.payment.providerOrderId ?? "Not created"}
            />
            <Separator />
            <Identifier
              label="PayPal capture"
              value={detail.payment.providerCaptureId ?? "Not captured"}
            />
            <Separator />
            <Identifier
              label="Checkout session"
              value={detail.payment.internalOrderId}
            />
            <Separator />
            <Identifier
              label="Checkout status"
              value={detail.payment.checkoutStatus ?? "Unavailable"}
              mono={false}
            />
            {detail.booking ? (
              <>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/admin/bookings/${detail.booking.bookingReference}`}
                    />
                  }
                >
                  Open booking
                  <ExternalLinkIcon data-icon="inline-end" />
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,1fr)]">
        <Card className="rounded-md">
          <CardHeader className="border-b">
            <CardTitle>Refund history</CardTitle>
            <CardDescription>
              Refunds remain controlled by the associated cancellation case.
            </CardDescription>
            {detail.cancellation ? (
              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/admin/cancellations/${detail.cancellation.requestId}`}
                    />
                  }
                >
                  Open cancellation
                  <ExternalLinkIcon data-icon="inline-end" />
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {detail.refunds.length === 0 ? (
              <Empty className="border-0 py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CircleDollarSignIcon />
                  </EmptyMedia>
                  <EmptyTitle>No refund attempts</EmptyTitle>
                  <EmptyDescription>
                    A reviewed cancellation case can create a provider or manual
                    refund.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col divide-y">
                {detail.refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-xs font-semibold">
                          {refund.id}
                        </p>
                        <RefundBadge
                          tone={refund.tone}
                          label={refund.statusLabel}
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Provider refund{" "}
                        {refund.providerRefundId ?? "not assigned"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {refund.updatedAtLabel}
                      </p>
                    </div>
                    <p className="text-base font-semibold tabular-nums">
                      <OriginalDecimalMoney
                        value={refund.amount}
                        currency={refund.currency}
                      />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader className="border-b">
            <CardTitle>Delivery health</CardTitle>
            <CardDescription>
              Background work and provider webhook processing.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <OperationGroup
              icon={WorkflowIcon}
              title="Background tasks"
              empty="No background tasks recorded."
              items={detail.operations.outbox.map((task) => ({
                id: task.id,
                label: task.taskLabel,
                status: task.status,
                attempts: task.attemptCount,
                error: task.lastError,
                date: task.updatedAtLabel,
              }))}
            />
            <Separator />
            <OperationGroup
              icon={WebhookIcon}
              title="PayPal webhooks"
              empty="No provider webhooks recorded."
              items={detail.operations.webhooks.map((webhook) => ({
                id: webhook.id,
                label: webhook.eventType,
                status: webhook.status,
                attempts: webhook.attemptCount,
                error: webhook.lastError,
                date: webhook.receivedAtLabel,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DetailMetric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof CreditCardIcon
  label: string
  value: React.ReactNode
  note: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-muted/40 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-primary ring-1 ring-border">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 truncate font-semibold tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  )
}

function PaymentBadge({ detail }: { detail: AdminPaymentDetailModel }) {
  return (
    <Badge
      variant={
        detail.payment.statusTone === "attention"
          ? "destructive"
          : detail.payment.statusTone === "success"
            ? "default"
            : detail.payment.statusTone === "pending"
              ? "secondary"
              : "outline"
      }
    >
      {detail.payment.statusLabel}
    </Badge>
  )
}

function RefundBadge({
  tone,
  label,
}: {
  tone: AdminPaymentDetailModel["refunds"][number]["tone"]
  label: string
}) {
  return (
    <Badge
      variant={
        tone === "attention"
          ? "destructive"
          : tone === "success"
            ? "default"
            : tone === "pending"
              ? "secondary"
              : "outline"
      }
    >
      {label}
    </Badge>
  )
}

function Identifier({
  label,
  value,
  mono = true,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-medium break-all",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function OperationGroup({
  icon: Icon,
  title,
  empty,
  items,
}: {
  icon: typeof RefreshCwIcon
  title: string
  empty: string
  items: Array<{
    id: string
    label: string
    status: string
    attempts: number
    error: string | null
    date: string
  }>
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{item.label}</p>
                <Badge
                  variant={item.status === "failed" ? "destructive" : "outline"}
                >
                  {item.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.date} · {item.attempts} processing attempt
                {item.attempts === 1 ? "" : "s"}
              </p>
              {item.error ? (
                <p className="mt-2 text-xs text-destructive">{item.error}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
