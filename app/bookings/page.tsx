import Link from "next/link"
import { redirect } from "next/navigation"

import { getActorContext } from "@/modules/auth/server"
import { parseBookingListQuery } from "@/modules/flights/orders/domain"
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
    q?: string
    status?: string
    sort?: string
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

  const normalizedQuery = parseBookingListQuery({
    page: resolvedSearchParams.page,
    pageSize: 10,
    q: resolvedSearchParams.q,
    status: resolvedSearchParams.status,
    sort: resolvedSearchParams.sort,
  })
  let result: Awaited<ReturnType<typeof listMyBookings>> | null = null

  try {
    result = await listMyBookings({
      actor,
      page: normalizedQuery.page,
      pageSize: normalizedQuery.pageSize,
      q: normalizedQuery.q,
      status: normalizedQuery.status,
      sort: normalizedQuery.sort,
    })
  } catch (error) {
    logFlightFlowError("BookingsPage", "render_error_state", error, {
      actorType: actor.type,
      page: normalizedQuery.page,
      q: normalizedQuery.q,
      status: normalizedQuery.status,
      sort: normalizedQuery.sort,
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
            q={result.q}
            status={result.status}
            sort={result.sort}
            total={result.total}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 text-base">
            <p className="text-base text-foreground">
              Unable to load bookings right now.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please refresh and try again.
            </p>
            <div className="mt-4">
              <Link
                href={`/bookings?page=${normalizedQuery.page}${
                  normalizedQuery.q ? `&q=${encodeURIComponent(normalizedQuery.q)}` : ""
                }&status=${normalizedQuery.status}&sort=${normalizedQuery.sort}`}
                className="text-base font-medium text-primary underline-offset-4 hover:underline"
              >
                Retry
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
