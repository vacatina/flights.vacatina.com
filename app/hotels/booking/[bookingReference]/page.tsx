import { getActorContext } from "@/modules/auth/server"
import { logHotelFlow } from "@/modules/hotels/shared/server/actions-logger"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"
import { fetchBookingPageData } from "@/modules/hotels/orders/server/service"
import { HotelBookingClient } from "@/modules/hotels/orders/ui/hotel-booking-client"

interface HotelBookingPageProps {
  params: Promise<{
    bookingReference: string
  }>
}

export default async function HotelBookingPage({ params }: HotelBookingPageProps) {
  const resolvedParams = await params

  const actor = await getActorContext({ ensureGuestSession: true })

  logHotelFlow("HotelBookingPage", "page_request", {
    bookingReference: resolvedParams.bookingReference,
    actorType: actor.type,
  })

  let data
  try {
    data = await fetchBookingPageData({
      bookingReference: resolvedParams.bookingReference,
    })
  } catch (error) {
    logHotelFlow("HotelBookingPage", "render_error_state", {
      bookingReference: resolvedParams.bookingReference,
      error: String(error),
    })

    return (
      <FlowPageErrorState
        title="Unable to load booking"
        message="Unable to load your booking details right now. Please check your email for confirmation."
        backHref="/hotels"
        backLabel="Back to search"
      />
    )
  }

  return <HotelBookingClient data={data} clerkEnabled={true} />
}
