import { HistoryIcon, ReceiptTextIcon, TriangleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatSerializedMoney } from "@/modules/currency/domain"
import {
  getVisaCountry,
  type VisaAssistanceResult,
} from "@/modules/visa-assistance/domain"
import {
  formatVisaAdjustment,
  type VisaFeePricing,
  type VisaPricingRule,
} from "@/modules/visa-assistance/pricing/domain"
import { toggleVisaPricingRuleFormAction } from "@/modules/visa-assistance/pricing/server/actions"
import type { VisaPricingAuditEvent } from "@/modules/visa-assistance/pricing/server/rule-repository"
import { VisaPricingPreviewSearch } from "@/modules/visa-assistance/pricing/ui/preview-search"
import { PendingLinkButton } from "@/modules/visa-assistance/pricing/ui/pending-link-button"

export function AdminVisaPricingDashboard({
  rules,
  events,
  preview,
  previewError,
  initialNationality,
  initialDestination,
}: {
  rules: VisaPricingRule[]
  events: VisaPricingAuditEvent[]
  preview: VisaAssistanceResult | null
  previewError: string | null
  initialNationality?: string
  initialDestination?: string
}) {
  const activeRules = rules.filter((rule) => rule.enabled)
  const exactRules = rules.filter(
    (rule) => rule.nationalityCode && rule.destinationCode
  )
  const defaults = rules.filter(
    (rule) =>
      !rule.nationalityCode &&
      !rule.destinationCode &&
      !rule.visaTypeId &&
      !rule.providerProductId
  )
  const hasProcessingDefault = defaults.some(
    (rule) => rule.enabled && rule.feeComponent === "processing_fee"
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Active rules" value={activeRules.length} />
        <SummaryCard label="Exact combinations" value={exactRules.length} />
        <SummaryCard label="Global defaults" value={defaults.length} />
      </div>

      {!hasProcessingDefault ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>No active global processing-fee rule</AlertTitle>
          <AlertDescription>
            Visa combinations without a more specific match currently pass
            through at supplier cost. Add a global processing rule to protect
            the default margin.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Live pricing preview</CardTitle>
          <CardDescription>
            Load current supplier fees and verify the winning rules before
            customers see them.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <VisaPricingPreviewSearch
            initialNationality={initialNationality}
            initialDestination={initialDestination}
          />
          {previewError ? (
            <p className="text-sm text-destructive">{previewError}</p>
          ) : null}
          {preview ? <PricingPreview result={preview} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing rules</CardTitle>
          <CardDescription>
            The most specific active rule wins, then priority resolves equal
            scopes.
          </CardDescription>
          <CardAction>
            <PendingLinkButton
              href="/admin/visa-pricing/new"
              pendingLabel="Opening form..."
              icon="plus"
              size="lg"
            >
              Add rule
            </PendingLinkButton>
          </CardAction>
        </CardHeader>
        <CardContent>
          {rules.length ? <RulesTable rules={rules} /> : <RulesEmptyState />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent pricing activity</CardTitle>
          <CardDescription>
            Immutable operator history for rule and status changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length ? (
            <div className="flex flex-col gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <HistoryIcon
                      className="mt-0.5 size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium">{event.ruleName}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.eventType} by{" "}
                        {event.actorEmail ?? "Unknown admin"}
                        {event.reason ? ` — ${event.reason}` : ""}
                      </p>
                    </div>
                  </div>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={event.createdAt.toISOString()}
                  >
                    {formatDate(event.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No pricing changes have been recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RulesTable({ rules }: { rules: VisaPricingRule[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rule</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Adjustment</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell className="font-medium">{rule.name}</TableCell>
            <TableCell>{formatScope(rule)}</TableCell>
            <TableCell>
              {rule.feeComponent === "processing_fee"
                ? "Processing"
                : "Government"}
            </TableCell>
            <TableCell>{formatVisaAdjustment(rule)}</TableCell>
            <TableCell>{rule.priority}</TableCell>
            <TableCell>
              <Badge variant={rule.enabled ? "secondary" : "outline"}>
                {rule.enabled ? "Active" : "Disabled"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <PendingLinkButton
                  href={`/admin/visa-pricing/${rule.id}`}
                  pendingLabel="Opening..."
                  size="sm"
                  variant="outline"
                >
                  Edit
                </PendingLinkButton>
                <form action={toggleVisaPricingRuleFormAction}>
                  <input type="hidden" name="id" value={rule.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={String(!rule.enabled)}
                  />
                  <PendingSubmitButton
                    size="sm"
                    variant="ghost"
                    pendingLabel={rule.enabled ? "Disabling..." : "Enabling..."}
                  >
                    {rule.enabled ? "Disable" : "Enable"}
                  </PendingSubmitButton>
                </form>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PricingPreview({ result }: { result: VisaAssistanceResult }) {
  return (
    <div className="flex flex-col gap-3 border-t pt-5">
      {result.eligibleDocuments.map((item, index) => (
        <div
          key={String(item.document.visa_type_id ?? index)}
          className="rounded-lg bg-muted/50 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {item.document.name ??
                  item.product?.product_name ??
                  "Visa product"}
              </p>
              <p className="text-xs text-muted-foreground">
                Visa type {String(item.document.visa_type_id ?? "—")} · Product{" "}
                {String(item.product?.product_id ?? "—")}
              </p>
            </div>
            {item.pricing?.totalSellMoney ? (
              <p className="text-lg font-semibold">
                {formatSerializedMoney(item.pricing.totalSellMoney)}
              </p>
            ) : (
              <Badge variant="outline">Price unavailable</Badge>
            )}
          </div>
          {item.pricing ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FeePreview
                label="Processing fee"
                fee={item.pricing.processingFee}
              />
              <FeePreview
                label="Government fee"
                fee={item.pricing.governmentFee}
              />
            </div>
          ) : null}
        </div>
      ))}
      {!result.eligibleDocuments.length ? (
        <p className="text-sm text-muted-foreground">
          No eligible visa product was returned for this combination.
        </p>
      ) : null}
    </div>
  )
}

function FeePreview({
  label,
  fee,
}: {
  label: string
  fee: VisaFeePricing | null
}) {
  if (!fee)
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        {label}: unavailable
      </div>
    )
  return (
    <div className="rounded-md border bg-background p-3 text-sm">
      <p className="font-medium">{label}</p>
      <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
        <dt className="text-muted-foreground">Supplier cost</dt>
        <dd className="text-right">{formatSerializedMoney(fee.sourceMoney)}</dd>
        <dt className="text-muted-foreground">Markup</dt>
        <dd className="text-right">{formatSerializedMoney(fee.markupMoney)}</dd>
        <dt className="font-medium">Customer price</dt>
        <dd className="text-right font-medium">
          {formatSerializedMoney(fee.sellMoney)}
        </dd>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        {fee.appliedRuleName ?? "No markup rule matched"}
      </p>
    </div>
  )
}

function RulesEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptTextIcon />
        </EmptyMedia>
        <EmptyTitle>No visa pricing rules</EmptyTitle>
        <EmptyDescription>
          Create a global processing-fee rule, then add exact overrides only
          where needed.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function formatScope(rule: VisaPricingRule) {
  const parts = [
    rule.nationalityCode
      ? `Passport: ${getVisaCountry(rule.nationalityCode)?.name ?? rule.nationalityCode}`
      : null,
    rule.destinationCode
      ? `To: ${getVisaCountry(rule.destinationCode)?.name ?? rule.destinationCode}`
      : null,
    rule.visaTypeId ? `Visa: ${rule.visaTypeId}` : null,
    rule.providerProductId ? `Product: ${rule.providerProductId}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : "Global default"
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
