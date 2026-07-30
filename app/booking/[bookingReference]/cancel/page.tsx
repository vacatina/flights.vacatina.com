import Link from "next/link"

import { getActorContext } from "@/modules/auth/server"
import { getCancellationEligibilityContext } from "@/modules/flights/cancellations/server"
import { CancellationRequestView } from "@/modules/flights/cancellations/ui"
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

interface CancellationPageProps {
  params: Promise<{ bookingReference: string }>
  searchParams: Promise<{ submitted?: string; error?: string }>
}

export default async function CancellationPage({
  params,
  searchParams,
}: CancellationPageProps) {
  const [actor, resolvedParams, resolvedSearchParams] = await Promise.all([
    getActorContext({ ensureGuestSession: true }),
    params,
    searchParams,
  ])
  let context: Awaited<
    ReturnType<typeof getCancellationEligibilityContext>
  > | null = null

  try {
    context = await getCancellationEligibilityContext({
      bookingReference: resolvedParams.bookingReference,
      actor,
    })
  } catch (error) {
    logFlightFlowError("CancellationPage", "render_error_state", error, {
      actorType: actor.type,
      bookingReference: resolvedParams.bookingReference,
    })
  }

  if (!context) {
    return (
      <main className="min-h-svh bg-muted/40 py-8 md:py-10">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 md:px-8">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Unable to load cancellation
          </h1>
          <p className="text-sm text-muted-foreground">
            We could not verify access to this booking. Please use booking lookup again.
          </p>
          <Button render={<Link href="/booking/lookup" />}>
            Go to booking lookup
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-background py-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 md:px-6 xl:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>
                Flights
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link
                    href={`/booking/${encodeURIComponent(context.booking.bookingReference)}`}
                  />
                }
              >
                {context.booking.bookingReference}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Cancel</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <CancellationRequestView
          context={context}
          submitted={resolvedSearchParams.submitted === "1"}
          error={resolvedSearchParams.error}
        />
      </div>
    </main>
  )
}
