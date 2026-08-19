import { getActorContext } from "@/modules/auth/server"
import { logFlowPageFailure } from "@/modules/flights/shared/server"
import { logHotelFlow } from "@/modules/hotels/shared/server/actions-logger"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"
import { fetchHotelRatesAction } from "@/modules/hotels/results/server/actions"
import type { HotelSearchCommand, HotelRoomOccupancy } from "@/modules/hotels/search/domain"
import { HotelResultsClient } from "@/modules/hotels/results/ui/hotel-results-client"

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
  }

  const result = await fetchHotelRatesAction(command)

  if (!result.ok) {
    logFlowPageFailure({
      scope: "HotelResultsPage",
      step: "fetch_failed",
      error: result.error,
      metadata: { placeId, checkin, checkout },
    })

    return (
      <FlowPageErrorState
        title="Unable to find hotels"
        message="We couldn't fetch hotel availability right now. Please try again."
        backHref="/hotels"
        backLabel="Back to search"
      />
    )
  }

  const renderKey = [
    placeId,
    checkin,
    checkout,
    occupancies.length,
  ].join("|")

  return <HotelResultsClient key={renderKey} response={result.data} command={command} destinationName={destinationName} />
}
