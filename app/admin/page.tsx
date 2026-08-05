import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminDashboard, AdminPanelShell } from "@/modules/flights/cancellations/ui"

export default async function AdminDashboardPage() {
  const admin = await requireActiveAdmin()
  const items = await listAdminCancellationRequests()

  return (
    <AdminPanelShell
      active="dashboard"
      title="Dashboard"
      description="Cancellation, refund, and manual support overview."
      adminEmail={admin.email}
      queueItems={items}
    >
      <AdminDashboard items={items} />
    </AdminPanelShell>
  )
}
