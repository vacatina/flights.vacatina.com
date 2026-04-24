import { getActorContext } from "@/modules/auth/server"
import { parseReviewUrlState } from "@/modules/flights/results/domain"
import { fetchReviewPageData } from "@/modules/flights/results/server"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import { ReviewPageClient } from "@/modules/flights/results/ui"
import {
  logFlowPageFailure,
  logFlowPageRequest,
} from "@/modules/flights/shared/server"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"

interface ReviewPageProps {
  params: Promise<{
    partialOfferRequestId: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  const actor = await getActorContext({
    ensureGuestSession: false,
  })
  logFlowPageRequest({
    scope: "ReviewPage",
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    searchParamKeys: Object.keys(resolvedSearchParams),
    actorType: actor.type,
  })
  const state = parseReviewUrlState(resolvedSearchParams)
  logFlightFlow("ReviewPage", "state_parsed", {
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    selectedCount: state.selected.length,
    fareCount: state.fare.length,
  })
  const result = await fetchReviewPageData({
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    state,
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((error) => {
      logFlowPageFailure({
        scope: "ReviewPage",
        step: "fetch_failed",
        error,
        metadata: {
          partialOfferRequestId: resolvedParams.partialOfferRequestId,
          selectedCount: state.selected.length,
          fareCount: state.fare.length,
        },
      })

      return {
        ok: false as const,
        message: "Could not load fare options right now. Please try again.",
      }
    })

  if (!result.ok) {
    logFlightFlow("ReviewPage", "render_error_state", {
      partialOfferRequestId: resolvedParams.partialOfferRequestId,
      hasMessage: Boolean(result.message),
    })
    return (
      <FlowPageErrorState
        title="Unable to load fare options"
        message={result.message}
        backHref="/"
        backLabel="Back to search"
      />
    )
  }

  const renderKey = [
    result.data.state.selected.join(","),
    result.data.state.fare.join(","),
  ].join("|")

  logFlightFlow("ReviewPage", "render_success_state", {
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    totalLegs: result.data.totalLegs,
    selectedCount: result.data.state.selected.length,
    fareCount: result.data.state.fare.length,
    checkoutEnabled: result.data.summary.checkoutEnabled,
  })

  return <ReviewPageClient key={renderKey} data={result.data} />
}
