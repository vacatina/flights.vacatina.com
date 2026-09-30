import { notFound } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { scaledIntegerToDecimal } from "@/modules/visa-assistance/pricing/domain"
import { defaultVisaPricingRuleRepository } from "@/modules/visa-assistance/pricing/server"
import {
  PendingLinkButton,
  VisaPricingRuleForm,
} from "@/modules/visa-assistance/pricing/ui"

interface PageProps {
  params: Promise<{ ruleId: string }>
}

export default async function LegacyEditVisaPricingRulePage({
  params,
}: PageProps) {
  const admin = await requireActiveAdmin()
  const { ruleId } = await params
  const [rule, queueItems] = await Promise.all([
    defaultVisaPricingRuleRepository.findById(ruleId),
    listAdminCancellationRequests(),
  ])
  if (!rule) notFound()

  return (
    <AdminPanelShell
      active="visa-pricing"
      title={rule.name}
      description="Update scope, markup, schedule, and audit reason."
      adminEmail={admin.email}
      queueItems={queueItems}
    >
      <div className="flex flex-col gap-4">
        <PendingLinkButton
          href="/admin/visa-pricing"
          pendingLabel="Returning..."
          variant="ghost"
          size="sm"
        >
          Back to visa pricing
        </PendingLinkButton>
        <Card>
          <CardHeader>
            <CardTitle>Rule details</CardTitle>
            <CardDescription>
              Saving creates an immutable before-and-after audit event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisaPricingRuleForm
              mode="edit"
              initialValues={{
                id: rule.id,
                name: rule.name,
                priority: rule.priority,
                feeComponent: rule.feeComponent,
                adjustmentType: rule.adjustmentType,
                adjustmentValue: scaledIntegerToDecimal(
                  rule.adjustmentAmount,
                  rule.adjustmentScale
                ),
                adjustmentCurrency: rule.adjustmentCurrency,
                nationalityCode: rule.nationalityCode,
                destinationCode: rule.destinationCode,
                visaTypeId: rule.visaTypeId,
                providerProductId: rule.providerProductId,
                activeFrom: toDateTimeLocal(rule.activeFrom),
                activeTo: toDateTimeLocal(rule.activeTo),
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AdminPanelShell>
  )
}

function toDateTimeLocal(value: Date | null) {
  return value?.toISOString().slice(0, 16) ?? ""
}
