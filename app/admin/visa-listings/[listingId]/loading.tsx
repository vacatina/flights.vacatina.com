import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { VisaCatalogLoading } from "@/modules/visa-assistance/catalog/ui/loading-state"

export default function LoadingVisaListing() {
  return (
    <AdminPanelShell
      active="visa-listings"
      title="Edit visa listing"
      description="Loading the visa details and checklist."
    >
      <VisaCatalogLoading editor />
    </AdminPanelShell>
  )
}
