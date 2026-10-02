import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { VisaCatalogLoading } from "@/modules/visa-assistance/catalog/ui/loading-state"

export default function LoadingVisaListings() {
  return (
    <AdminPanelShell
      active="visa-listings"
      title="Visa Listings"
      description="Loading your visa catalog."
    >
      <VisaCatalogLoading />
    </AdminPanelShell>
  )
}
