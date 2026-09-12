import { notFound } from "next/navigation"

import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server"
import { getAdminVisaApplicationDetail } from "@/modules/visa-assistance/applications/server"
import { AdminVisaApplicationDetail } from "@/modules/visa-assistance/applications/ui/admin-application-detail"

export default async function AdminVisaApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const admin = await requireActiveAdmin()
  const { applicationId } = await params
  const detail = await getAdminVisaApplicationDetail(applicationId)

  if (!detail) notFound()

  return (
    <AdminPanelShell
      active="visa-applications"
      title={detail.application.reference}
      description="Visa request detail, documents, pricing estimate, and audit history."
      adminEmail={admin.email}
    >
      <AdminVisaApplicationDetail detail={detail} />
    </AdminPanelShell>
  )
}
