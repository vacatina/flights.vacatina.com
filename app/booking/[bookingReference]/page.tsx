import Link from "next/link"

import { getActorContext } from "@/modules/auth/server"
import { getBookingDetail } from "@/modules/flights/orders/server"
import { BookingDetailView } from "@/modules/flights/orders/ui"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { logFlightFlowError } from "@/lib/logging/flow-debug"

interface BookingDetailPageProps {
  params: Promise<{
    bookingReference: string
  }>
  searchParams: Promise<{
    refresh?: string
  }>
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: BookingDetailPageProps) {
  const [actor, resolvedParams, resolvedSearchParams] = await Promise.all([
    getActorContext({ ensureGuestSession: false }),
    params,
    searchParams,
  ])
  const refreshFromDuffel = resolvedSearchParams.refresh === "1"
  let detail: Awaited<ReturnType<typeof getBookingDetail>> | null = null

  try {
    detail = await getBookingDetail({
      actor,
      reference: resolvedParams.bookingReference,
      refreshFromDuffel,
    })
  } catch (error) {
    logFlightFlowError("BookingDetailPage", "render_error_state", error, {
      actorType: actor.type,
      bookingReference: resolvedParams.bookingReference,
      refreshFromDuffel,
    })
  }

  if (!detail) {
    return (
      <main className="min-h-svh bg-muted/40 py-8 md:py-10">
        <div className="mx-auto w-full max-w-[780px] space-y-4 px-4 md:px-8">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Unable to load booking
          </h1>
          <p className="text-sm text-muted-foreground">
            We could not verify access to this booking. Please use booking lookup again.
          </p>
          <Button render={<Link href="/booking/lookup" />}>Go to booking lookup</Button>
        </div>
      </main>
    )
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
              <BreadcrumbLink render={<Link href="/bookings" />}>Bookings</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{detail.bookingReference}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Booking details
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reference: {detail.bookingReference}
            </p>
          </div>
          <Button
            variant="outline"
            render={
              <Link href={`/booking/${encodeURIComponent(detail.bookingReference)}?refresh=1`} />
            }
          >
            Refresh status
          </Button>
        </div>

        <BookingDetailView detail={detail} />
      </div>
    </main>
  )
}
