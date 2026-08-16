import {
  listAdminCancellationRequests,
  getCurrentBusinessSettings,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { BusinessSettingsForm } from "@/modules/flights/cancellations/ui"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"

export default async function AdminSettingsPage() {
  const admin = await requireActiveAdmin()
  const [settings, items] = await Promise.all([
    getCurrentBusinessSettings(),
    listAdminCancellationRequests(),
  ])

  return (
    <AdminPanelShell
      active="settings"
      title="Admin Settings"
      description="Business and support details used by cancellation support screens."
      adminEmail={admin.email}
      queueItems={items}
    >
      <BusinessSettingsForm settings={settings} />
    </AdminPanelShell>
  )
}
