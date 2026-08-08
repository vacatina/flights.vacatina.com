import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminPanelShell } from "@/modules/flights/cancellations/ui"
import { parseAdminBookingListQuery } from "@/modules/flights/orders/domain"
import { listAdminBookings } from "@/modules/flights/orders/server"
import { AdminBookingsTable } from "@/modules/flights/orders/ui"

interface AdminBookingsPageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    q?: string
    status?: string
    sort?: string
  }>
}

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  const admin = await requireActiveAdmin()
  const query = parseAdminBookingListQuery(await searchParams)
  const [result, queueItems] = await Promise.all([
    listAdminBookings(query),
    listAdminCancellationRequests(),
  ])

  return (
    <AdminPanelShell
      active="bookings"
      title="Bookings"
      description="Search and inspect every flight order from one operational view."
      adminEmail={admin.email}
      queueItems={queueItems}
    >
      <AdminBookingsTable result={result} />
    </AdminPanelShell>
  )
}
