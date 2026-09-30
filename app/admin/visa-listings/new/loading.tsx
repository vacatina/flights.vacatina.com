import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { VisaCatalogLoading } from "@/modules/visa-assistance/catalog/ui/loading-state"

export default function LoadingNewVisaListing() {
  return (
    <AdminPanelShell
      active="visa-listings"
      title="New visa listing"
      description="Preparing the editor."
    >
      <VisaCatalogLoading editor />
    </AdminPanelShell>
  )
}
