import { getActorContext } from "@/modules/auth/server"
import { getAuthServerConfig } from "@/modules/auth/server/config"
import {
  parseCheckoutUrlState,
} from "@/modules/flights/checkout/domain/query-state"
import {
  fetchCheckoutPageData,
} from "@/modules/flights/checkout/server/service"
import { CheckoutPageClient } from "@/modules/flights/checkout/ui"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"
import { logFlowPageRequest } from "@/modules/flights/shared/server"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"

interface CheckoutPageProps {
  params: Promise<{
    partialOfferRequestId: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams])
  const { clerkEnabled } = getAuthServerConfig()
  const actor = await getActorContext({
    ensureGuestSession: true,
  })
  logFlowPageRequest({
    scope: "CheckoutPage",
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    searchParamKeys: Object.keys(resolvedSearchParams),
    actorType: actor.type,
  })

  let state: ReturnType<typeof parseCheckoutUrlState>

  try {
    state = parseCheckoutUrlState(resolvedSearchParams)
  } catch {
    const message = "Invalid checkout link. Please return to fare options."
    return (
      <FlowPageErrorState
        title="Unable to load checkout"
        message={message}
        backHref={`/results/${resolvedParams.partialOfferRequestId}/review`}
        backLabel="Back to fare options"
      />
    )
  }

  try {
    const data = await fetchCheckoutPageData({
      partialOfferRequestId: resolvedParams.partialOfferRequestId,
      state,
      actor,
    })
    logFlightFlow("CheckoutPage", "render_success_state", {
      partialOfferRequestId: resolvedParams.partialOfferRequestId,
      offerId: state.offerId,
      selectedCount: state.selectedPartialOffers.length,
      quoteId: state.quoteId,
      actorType: actor.type,
    })

    return renderCheckoutContent(data, clerkEnabled)
  } catch (error) {
    logFlightFlowError("CheckoutPage", "render_error_state", error, {
      partialOfferRequestId: resolvedParams.partialOfferRequestId,
      offerId: state.offerId,
      selectedCount: state.selectedPartialOffers.length,
      quoteId: state.quoteId,
      actorType: actor.type,
    })
    return (
      <FlowPageErrorState
        title="Unable to load checkout"
        message="Unable to load checkout details right now. Please try again."
        backHref={`/results/${resolvedParams.partialOfferRequestId}/review`}
        backLabel="Back to fare options"
      />
    )
  }
}

function renderCheckoutContent(data: Awaited<ReturnType<typeof fetchCheckoutPageData>>, clerkEnabled: boolean) {
  return <CheckoutPageClient data={data} clerkEnabled={clerkEnabled} />
}
