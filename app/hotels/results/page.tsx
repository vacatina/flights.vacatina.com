import { getActorContext } from "@/modules/auth/server"
import { logFlowPageFailure } from "@/modules/flights/shared/server"
import { logHotelFlow } from "@/modules/hotels/shared/server/actions-logger"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"
import { format } from "date-fns"
import { Suspense } from "react"
import type { HotelSearchCommand, HotelRoomOccupancy } from "@/modules/hotels/search/domain"
import { HotelResultsData } from "@/modules/hotels/results/ui/hotel-results-data"
import { HotelResultsSkeleton } from "@/modules/hotels/results/ui/hotel-results-skeleton"

interface HotelResultsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HotelResultsPage({ searchParams }: HotelResultsPageProps) {
  const resolvedSearchParams = await searchParams
  const actor = await getActorContext({ ensureGuestSession: false })

  logHotelFlow("HotelResultsPage", "page_request", {
    searchParamKeys: Object.keys(resolvedSearchParams),
    actorType: actor.type,
  })

  // Parse search params
  const placeId = resolvedSearchParams.placeId as string
  const checkin = resolvedSearchParams.checkin as string
  const checkout = resolvedSearchParams.checkout as string
  const destinationName = (resolvedSearchParams.destinationName as string) || "Destination"
  const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit as string) : 10
  const offset = resolvedSearchParams.offset ? parseInt(resolvedSearchParams.offset as string) : 0
  const sortBy = (resolvedSearchParams.sortBy as string) || undefined
  
  let occupancies: HotelRoomOccupancy[] = []
  try {
    occupancies = JSON.parse(resolvedSearchParams.occupancies as string)
  } catch (error) {
    occupancies = []
  }

  if (!placeId || !checkin || !checkout || occupancies.length === 0) {
    return (
      <FlowPageErrorState
        title="Invalid Search"
        message="Your search parameters are missing or invalid."
        backHref="/hotels"
        backLabel="Back to search"
      />
    )
  }

  const command: HotelSearchCommand = {
    placeId,
    checkin,
    checkout,
    occupancies,
    guestNationality: "US", // Default
    currency: "USD", // Default
    limit,
    offset,
    sortBy,
  }

  const guestsCount = occupancies.reduce(
    (acc, occ) => acc + occ.adults + (occ.children?.length ?? 0),
    0
  )

  return (
    <div className="min-h-screen bg-muted/30 pb-20 pt-8">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        {/* Header Summary */}
        <div className="mb-8 flex flex-col gap-2 rounded-xl bg-white p-6 shadow-sm ring-1 ring-border">
          <h1 className="text-2xl font-semibold text-foreground">
            Hotels in {destinationName}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            {format(new Date(checkin), "MMM d")} - {format(new Date(checkout), "MMM d")} • {guestsCount} guest{guestsCount !== 1 ? "s" : ""} • {occupancies.length} room{occupancies.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Suspense fallback={<HotelResultsSkeleton />}>
          <HotelResultsData command={command} />
        </Suspense>
      </div>
    </div>
  )
}
