import { getActorContext } from "@/modules/auth/server"
import { parseResultsUrlState } from "@/modules/flights/results/domain"
import { fetchFareOptionsData } from "@/modules/flights/results/server"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import { FareOptionsPageClient } from "@/modules/flights/results/ui"
import {
  logFlowPageFailure,
  logFlowPageRequest,
} from "@/modules/flights/shared/server"
import { FlowPageErrorState } from "@/modules/flights/shared/ui"

interface FareOptionsPageProps {
  params: Promise<{
    partialOfferRequestId: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FareOptionsPage({
  params,
  searchParams,
}: FareOptionsPageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  const actor = await getActorContext({
    ensureGuestSession: false,
  })

  logFlowPageRequest({
    scope: "FareOptionsPage",
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    searchParamKeys: Object.keys(resolvedSearchParams),
    actorType: actor.type,
  })
  const state = parseResultsUrlState(resolvedSearchParams)
  logFlightFlow("FareOptionsPage", "state_parsed", {
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    leg: state.leg,
    selectedCount: state.selected.length,
    sort: state.sort,
    stops: state.stops,
    hasAfter: Boolean(state.after),
  })
  const result = await fetchFareOptionsData({
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    state,
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((error) => {
      logFlowPageFailure({
        scope: "FareOptionsPage",
        step: "fetch_failed",
        error,
        metadata: {
          partialOfferRequestId: resolvedParams.partialOfferRequestId,
          leg: state.leg,
          selectedCount: state.selected.length,
        },
      })

      return {
        ok: false as const,
        message: "Could not load fare options right now. Please try again.",
      }
    })

  if (!result.ok) {
    logFlightFlow("FareOptionsPage", "render_error_state", {
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
    result.data.leg,
    result.data.state.sort,
    result.data.state.stops,
    result.data.state.airline ?? "",
    result.data.state.flightNumber ?? "",
    result.data.state.takeoffFrom,
    result.data.state.takeoffTo,
    result.data.state.landingFrom,
    result.data.state.landingTo,
    result.data.selected.join(","),
  ].join("|")

  logFlightFlow("FareOptionsPage", "render_success_state", {
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    leg: result.data.leg,
    totalLegs: result.data.totalLegs,
    selectedCount: result.data.selected.length,
    offerCount: result.data.offers.length,
    after: result.data.after,
  })

  return <FareOptionsPageClient key={renderKey} data={result.data} />
}
