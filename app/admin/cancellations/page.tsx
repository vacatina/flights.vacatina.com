import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import {
  AdminCancellationQueue,
  AdminPanelShell,
} from "@/modules/flights/cancellations/ui"

export default async function AdminCancellationsPage() {
  const admin = await requireActiveAdmin()
  const items = await listAdminCancellationRequests()

  return (
    <AdminPanelShell
      active="cancellations"
      title="Cancellation Queue"
      description="Review full-booking cancellation requests and refund readiness."
      adminEmail={admin.email}
      queueItems={items}
    >
      <AdminCancellationQueue items={items} />
    </AdminPanelShell>
  )
}
