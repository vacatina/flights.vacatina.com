import Link from "next/link"
import { redirect } from "next/navigation"

import { getActorContext } from "@/modules/auth/server"
import { listMyBookings } from "@/modules/flights/orders/server"
import { BookingsListView } from "@/modules/flights/orders/ui"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { logFlightFlowError } from "@/lib/logging/flow-debug"

interface BookingsPageProps {
  searchParams: Promise<{
    page?: string
  }>
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const [actor, resolvedSearchParams] = await Promise.all([
    getActorContext({ ensureGuestSession: false }),
    searchParams,
  ])

  if (actor.type !== "user") {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/bookings")}`)
  }

  const page = Number.parseInt(resolvedSearchParams.page ?? "1", 10)
  const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1
  let result: Awaited<ReturnType<typeof listMyBookings>> | null = null

  try {
    result = await listMyBookings({
      actor,
      page: normalizedPage,
      pageSize: 10,
    })
  } catch (error) {
    logFlightFlowError("BookingsPage", "render_error_state", error, {
      actorType: actor.type,
      page: normalizedPage,
    })
  }

  return (
    <main className="min-h-svh bg-muted/40 py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1160px] space-y-6 px-4 md:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>My bookings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your previous bookings.
          </p>
        </div>

        {result ? (
          <BookingsListView
            items={result.items}
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Unable to load bookings right now. Please try again.
          </p>
        )}
      </div>
    </main>
  )
}
