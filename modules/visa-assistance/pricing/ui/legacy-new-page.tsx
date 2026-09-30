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
import {
  PendingLinkButton,
  VisaPricingRuleForm,
} from "@/modules/visa-assistance/pricing/ui"

export default async function LegacyNewVisaPricingRulePage() {
  const admin = await requireActiveAdmin()
  const queueItems = await listAdminCancellationRequests()

  return (
    <AdminPanelShell
      active="visa-pricing"
      title="New Visa Pricing Rule"
      description="Create a global default or a more specific visa pricing override."
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
              Empty scope fields create a global rule for the selected fee
              component.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisaPricingRuleForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </AdminPanelShell>
  )
}
