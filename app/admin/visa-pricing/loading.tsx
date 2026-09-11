import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { VisaPricingAdminLoadingState } from "@/modules/visa-assistance/pricing/ui"

export default function VisaPricingLoading() {
  return (
    <AdminPanelShell
      active="visa-pricing"
      title="Visa Pricing"
      description="Loading pricing rules and current supplier fees."
    >
      <VisaPricingAdminLoadingState />
    </AdminPanelShell>
  )
}
