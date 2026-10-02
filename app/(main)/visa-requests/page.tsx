import { redirect } from "next/navigation"

import { CustomerDashboardHeader } from "@/components/customer-dashboard/customer-dashboard-header"
import {
  getOwnedVisaApplicationList,
  getVisaApplicationActor,
} from "@/modules/visa-assistance/applications/server"
import { CustomerVisaApplicationList } from "@/modules/visa-assistance/applications/ui/customer-application-list"

const PAGE_SIZE = 10

export default async function VisaRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const [actor, resolvedSearchParams] = await Promise.all([
    getVisaApplicationActor(),
    searchParams,
  ])

  if (!actor) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/visa-requests")}`)
  }

  const page = parsePage(resolvedSearchParams.page)
  const result = await getOwnedVisaApplicationList({
    actorUserId: actor.appUserId,
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <main className="min-h-svh bg-muted/40 py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 md:px-8">
        <CustomerDashboardHeader activeSection="visa-requests" />
        <CustomerVisaApplicationList
          applications={result.items}
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
          statusCounts={result.statusCounts}
        />
      </div>
    </main>
  )
}

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}
