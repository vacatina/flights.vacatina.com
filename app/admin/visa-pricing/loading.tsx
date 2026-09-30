import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { VisaCatalogLoading } from "@/modules/visa-assistance/catalog/ui/loading-state"

export default function VisaPricingLoading() {
  return (
    <AdminPanelShell
      active="visa-listings"
      title="Visa Listings"
      description="Opening your visa catalog."
    >
      <VisaCatalogLoading />
    </AdminPanelShell>
  )
}
