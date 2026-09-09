import { getActorContext } from "@/modules/auth/server"
import { logHotelFlow } from "@/modules/hotels/shared/server/actions-logger"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"
import { fetchCheckoutPageData } from "@/modules/hotels/checkout/server/service"
import { HotelCheckoutClient } from "@/modules/hotels/checkout/ui/hotel-checkout-client"

interface CheckoutPageProps {
  params: Promise<{
    prebookId: string
  }>
}

export default async function HotelCheckoutPage({ params }: CheckoutPageProps) {
  const resolvedParams = await params
  
  const actor = await getActorContext({ ensureGuestSession: true })

  logHotelFlow("HotelCheckoutPage", "page_request", {
    prebookId: resolvedParams.prebookId,
    actorType: actor.type,
  })

  try {
    const data = await fetchCheckoutPageData({
      prebookId: resolvedParams.prebookId,
    })

    return <HotelCheckoutClient data={data} clerkEnabled={true} />
  } catch (error) {
    logHotelFlow("HotelCheckoutPage", "render_error_state", {
      prebookId: resolvedParams.prebookId,
      error: String(error)
    })
    
    return (
      <FlowPageErrorState
        title="Unable to load checkout"
        message="Unable to load checkout details right now. The session may have expired."
        backHref={`/hotels`}
        backLabel="Back to search"
      />
    )
  }
}
