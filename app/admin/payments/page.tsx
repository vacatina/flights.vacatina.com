import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { parseAdminPaymentListQuery } from "@/modules/payments/domain"
import { listAdminPayments } from "@/modules/payments/server"
import { AdminPaymentsTable } from "@/modules/payments/ui"

interface AdminPaymentsPageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    q?: string
    paymentStatus?: string
    refundStatus?: string
    sort?: string
  }>
}

export default async function AdminPaymentsPage({
  searchParams,
}: AdminPaymentsPageProps) {
  const admin = await requireActiveAdmin()
  const query = parseAdminPaymentListQuery(await searchParams)
  const [result, queueItems] = await Promise.all([
    listAdminPayments(query),
    listAdminCancellationRequests(),
  ])

  return (
    <AdminPanelShell
      active="payments"
      title="Payments & Refunds"
      description="Inspect provider payments, refund progress, and reconciliation health."
      adminEmail={admin.email}
      queueItems={queueItems}
    >
      <AdminPaymentsTable result={result} />
    </AdminPanelShell>
  )
}
