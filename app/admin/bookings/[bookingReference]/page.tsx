import { notFound } from "next/navigation"

import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminPanelShell } from "@/modules/flights/cancellations/ui"
import { getAdminBookingDetail } from "@/modules/flights/orders/server"
import { AdminBookingDetail } from "@/modules/flights/orders/ui"

interface AdminBookingDetailPageProps {
  params: Promise<{ bookingReference: string }>
}

export default async function AdminBookingDetailPage({
  params,
}: AdminBookingDetailPageProps) {
  const admin = await requireActiveAdmin()
  const { bookingReference } = await params
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
      <AdminBookingDetail detail={detail} />
    </AdminPanelShell>
  )
}
