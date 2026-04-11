import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActorContext } from "@/modules/auth/server"
import { parseReviewUrlState } from "@/modules/flights/results/domain"
import { fetchReviewPageData } from "@/modules/flights/results/server"
import { logFlightFlow, logFlightFlowError } from "@/modules/flights/shared/flow-debug"
import { ReviewPageClient } from "@/modules/flights/results/ui"

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
  logFlightFlow("ReviewPage", "request_received", {
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
      logFlightFlowError("ReviewPage", "fetch_failed", error, {
        partialOfferRequestId: resolvedParams.partialOfferRequestId,
        selectedCount: state.selected.length,
        fareCount: state.fare.length,
      })
      console.error("[flights/results] ReviewPage failed", {
        partialOfferRequestId: resolvedParams.partialOfferRequestId,
        selectedCount: state.selected.length,
        fareCount: state.fare.length,
      })
      console.error(error)

      return {
        ok: false as const,
        message:
          error instanceof Error ? error.message : "Could not load fare options.",
      }
    })

  if (!result.ok) {
    logFlightFlow("ReviewPage", "render_error_state", {
      partialOfferRequestId: resolvedParams.partialOfferRequestId,
      hasMessage: Boolean(result.message),
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
