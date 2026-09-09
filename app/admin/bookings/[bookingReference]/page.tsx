import { notFound } from "next/navigation"

import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { getAdminBookingDetail } from "@/modules/flights/orders/server"
import { AdminBookingDetail } from "@/modules/flights/orders/ui"

interface AdminBookingDetailPageProps {
  params: Promise<{ bookingReference: string }>
  searchParams: Promise<{ cancelError?: string }>
}

export default async function AdminBookingDetailPage({
  params,
  searchParams,
}: AdminBookingDetailPageProps) {
  const admin = await requireActiveAdmin()
  const [{ bookingReference }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  const [detail, queueItems] = await Promise.all([
    getAdminBookingDetail(bookingReference),
    listAdminCancellationRequests(),
  ])

  if (!detail) {
    notFound()
  }

  return (
    <AdminPanelShell
      active="bookings"
      title={detail.booking.bookingReference}
      description={`${detail.booking.snapshot.routeLabel} booking record.`}
      adminEmail={admin.email}
      queueItems={queueItems}
    >
      <AdminBookingDetail
        detail={detail}
        cancellationError={resolvedSearchParams.cancelError}
      />
    </AdminPanelShell>
  )
}
