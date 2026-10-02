import { CustomerDashboardHeader } from "@/components/customer-dashboard/customer-dashboard-header"
import { CustomerVisaDetailSkeleton } from "@/modules/visa-assistance/applications/ui/customer-dashboard-loading"

export default function VisaRequestDetailLoading() {
  return (
    <main className="min-h-svh bg-muted/40 py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 md:px-8">
        <CustomerDashboardHeader activeSection="visa-requests" />
        <CustomerVisaDetailSkeleton />
      </div>
    </main>
  )
}
