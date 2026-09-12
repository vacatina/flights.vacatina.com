import { CustomerDashboardHeader } from "@/components/customer-dashboard/customer-dashboard-header"
import { loadOwnedVisaApplicationPage } from "@/modules/visa-assistance/applications/server"
import { CustomerVisaApplicationDetail } from "@/modules/visa-assistance/applications/ui/customer-application-detail"

export default async function VisaRequestDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const path = `/visa-requests/${applicationId}`
  const { detail } = await loadOwnedVisaApplicationPage(applicationId, path)

  return (
    <main className="min-h-svh bg-muted/40 py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 md:px-8">
        <CustomerDashboardHeader activeSection="visa-requests" />
        <CustomerVisaApplicationDetail detail={detail} />
      </div>
    </main>
  )
}
