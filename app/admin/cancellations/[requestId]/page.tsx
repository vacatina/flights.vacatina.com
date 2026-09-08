import {
  listAdminCancellationRequests,
  getAdminCancellationDetail,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminCancellationDetail } from "@/modules/flights/cancellations/ui"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"

interface AdminCancellationDetailPageProps {
  params: Promise<{ requestId: string }>
}

export default async function AdminCancellationDetailPage({
  params,
}: AdminCancellationDetailPageProps) {
  const admin = await requireActiveAdmin()
  const { requestId } = await params
  const [detail, items] = await Promise.all([
    getAdminCancellationDetail(requestId),
    listAdminCancellationRequests(),
  ])

  return (
    <AdminPanelShell
      active="cancellations"
      title={detail.booking.reference}
      description={`${detail.booking.routeLabel} cancellation detail.`}
      adminEmail={admin.email}
      queueItems={items}
    >
      <AdminCancellationDetail detail={detail} />
    </AdminPanelShell>
  )
}
