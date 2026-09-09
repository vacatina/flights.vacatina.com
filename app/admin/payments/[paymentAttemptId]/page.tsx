import { notFound } from "next/navigation"

import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { getAdminPaymentDetail } from "@/modules/payments/server"
import { AdminPaymentDetail } from "@/modules/payments/ui"

interface AdminPaymentDetailPageProps {
  params: Promise<{ paymentAttemptId: string }>
  searchParams: Promise<{ error?: string; reconciled?: string }>
}

export default async function AdminPaymentDetailPage({
  params,
  searchParams,
}: AdminPaymentDetailPageProps) {
  const admin = await requireActiveAdmin()
  const { paymentAttemptId } = await params
  const query = await searchParams
  const [detail, queueItems] = await Promise.all([
    getAdminPaymentDetail(paymentAttemptId),
    listAdminCancellationRequests(),
  ])

  if (!detail) {
    notFound()
  }

  return (
    <AdminPanelShell
      active="payments"
      title="Payment record"
      description={`${detail.payment.provider} payment linked to ${detail.booking?.bookingReference ?? "checkout"}.`}
      adminEmail={admin.email}
      queueItems={queueItems}
    >
      <AdminPaymentDetail
        detail={detail}
        error={query.error}
        reconciled={query.reconciled === "1"}
      />
    </AdminPanelShell>
  )
}
