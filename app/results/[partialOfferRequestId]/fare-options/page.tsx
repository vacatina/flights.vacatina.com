import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { parseResultsUrlState } from "@/modules/flights/results/domain"
import { fetchFareOptionsData } from "@/modules/flights/results/server"
import { logFlightFlow, logFlightFlowError } from "@/modules/flights/shared/flow-debug"
import { FareOptionsPageClient } from "@/modules/flights/results/ui"

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

  logFlightFlow("FareOptionsPage", "request_received", {
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    searchParamKeys: Object.keys(resolvedSearchParams),
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
      logFlightFlowError("FareOptionsPage", "fetch_failed", error, {
        partialOfferRequestId: resolvedParams.partialOfferRequestId,
        leg: state.leg,
        selectedCount: state.selected.length,
      })
      console.error("[flights/results] FareOptionsPage failed", {
        partialOfferRequestId: resolvedParams.partialOfferRequestId,
        leg: state.leg,
        selectedCount: state.selected.length,
      })
      console.error(error)

      return {
        ok: false as const,
        message:
          error instanceof Error ? error.message : "Could not load fare options.",
      }
    })

  if (!result.ok) {
    logFlightFlow("FareOptionsPage", "render_error_state", {
      partialOfferRequestId: resolvedParams.partialOfferRequestId,
      message: result.message,
    })
    return (
      <main className="min-h-svh bg-muted/40 py-10">
        <div className="mx-auto w-full max-w-2xl px-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Unable to load fare options</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-muted-foreground">{result.message}</p>
              <Button className="w-fit" render={<Link href="/" />}>
                Back to search
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
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
