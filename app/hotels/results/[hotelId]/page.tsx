import { getActorContext } from "@/modules/auth/server"
import { logHotelFlow } from "@/modules/hotels/shared/server/actions-logger"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"
import type { HotelSearchCommand, HotelRoomOccupancy } from "@/modules/hotels/search/domain"
import { getCachedLiteApiRates } from "@/modules/hotels/results/server/cached-rates"
import { HotelDetailsClient } from "@/modules/hotels/prebook/ui/hotel-details-client"

interface HotelDetailsPageProps {
  params: Promise<{
    hotelId: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HotelDetailsPage({ params, searchParams }: HotelDetailsPageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  
  const actor = await getActorContext({ ensureGuestSession: false })
  const hotelId = resolvedParams.hotelId

  logHotelFlow("HotelDetailsPage", "page_request", {
    hotelId,
    searchParamKeys: Object.keys(resolvedSearchParams),
    actorType: actor.type,
  })

  // Parse search params to reconstruct the command
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
    guestNationality: "US",
    currency: "USD",
  }

  // Fetch the 300 cached results
  const response = await getCachedLiteApiRates(command)

  // Find the specific hotel
  const hotel = response.hotels?.find(h => h.id === hotelId)
  const ratesData = response.data?.find(d => d.hotelId === hotelId)

  if (!hotel || !ratesData) {
    return (
      <FlowPageErrorState
        title="Hotel Not Found"
        message="We couldn't find the availability for this hotel. It may have sold out."
        backHref={`/hotels/results?${new URLSearchParams(resolvedSearchParams as Record<string, string>).toString()}`}
        backLabel="Back to search results"
      />
    )
  }

  const guestsCount = occupancies.reduce(
    (acc, occ) => acc + occ.adults + (occ.children?.length ?? 0),
    0
  )

  const searchSummary = {
    destinationName,
    checkin,
    checkout,
    guestsCount,
    roomsCount: occupancies.length
  }

  return <HotelDetailsClient hotel={hotel} ratesData={ratesData} summary={searchSummary} searchParams={resolvedSearchParams as Record<string, string>} />
}
