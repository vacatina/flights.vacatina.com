import { fetchHotelRatesAction } from "@/modules/hotels/results/server/actions"
import { HotelResultsClient } from "@/modules/hotels/results/ui/hotel-results-client"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"
import { logFlowPageFailure } from "@/modules/flights/shared/server"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"

interface HotelResultsDataProps {
  command: HotelSearchCommand
}

export async function HotelResultsData({ command }: HotelResultsDataProps) {
  const result = await fetchHotelRatesAction(command)

  if (!result.ok) {
    logFlowPageFailure({
      scope: "HotelResultsData",
      step: "fetch_failed",
      error: result.error,
      metadata: { placeId: command.placeId, checkin: command.checkin, checkout: command.checkout },
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
    command.placeId,
    command.checkin,
    command.checkout,
    command.occupancies.length,
  ].join("|")

  return <HotelResultsClient key={renderKey} response={result.data} command={command} />
}
