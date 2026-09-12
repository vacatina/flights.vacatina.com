import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import {
  VISA_APPLICATION_STATUSES,
  type VisaApplicationStatus,
} from "@/modules/visa-assistance/applications/domain"
import { listAdminVisaApplications } from "@/modules/visa-assistance/applications/server"
import { AdminVisaApplicationList } from "@/modules/visa-assistance/applications/ui/admin-application-list"

export default async function AdminVisaApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string; page?: string }>
}) {
  const admin = await requireActiveAdmin()
  const filters = await searchParams
  const status = isVisaApplicationStatus(filters.status)
    ? filters.status
    : undefined
  const page = parsePage(filters.page)
  const pageSize = 25
  const [applicationResults, queueItems] = await Promise.all([
    listAdminVisaApplications({
      query: filters.query,
      status,
      limit: pageSize + 1,
      offset: (page - 1) * pageSize,
    }),
    listAdminCancellationRequests(),
  ])
  const hasNextPage = applicationResults.length > pageSize
  const applications = applicationResults.slice(0, pageSize)

  return (
    <AdminPanelShell
      active="visa-applications"
      title="Visa Requests"
      description="Review submitted traveler information, documents, pricing estimates, and operational status."
      adminEmail={admin.email}
      queueItems={queueItems}
    >
      <AdminVisaApplicationList
        applications={applications}
        query={filters.query}
        status={status}
        page={page}
        hasNextPage={hasNextPage}
      />
    </AdminPanelShell>
  )
}

function parsePage(value: string | undefined) {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function isVisaApplicationStatus(
  value: string | undefined
): value is VisaApplicationStatus {
  return VISA_APPLICATION_STATUSES.some((status) => status === value)
}
