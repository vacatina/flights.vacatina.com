import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  let state: ReturnType<typeof parseCheckoutUrlState>

  try {
    state = parseCheckoutUrlState(resolvedSearchParams)
  } catch {
    const message = "Invalid checkout link. Please return to fare options."
    return (
      <CheckoutErrorState
        partialOfferRequestId={resolvedParams.partialOfferRequestId}
        message={message}
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
      <CheckoutErrorState
        partialOfferRequestId={resolvedParams.partialOfferRequestId}
        message="Unable to load checkout details right now. Please try again."
      />
    )
  }
}

function renderCheckoutContent(data: Awaited<ReturnType<typeof fetchCheckoutPageData>>, clerkEnabled: boolean) {
  return <CheckoutPageClient data={data} clerkEnabled={clerkEnabled} />
}

function CheckoutErrorState({
  partialOfferRequestId,
  message,
}: {
  partialOfferRequestId: string
  message: string
}) {
  return (
    <main className="min-h-svh bg-muted/40 py-10">
      <div className="mx-auto w-full max-w-2xl px-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Unable to load checkout</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">{message}</p>
            <Button
              className="w-fit"
              render={<Link href={`/results/${partialOfferRequestId}/review`} />}
            >
              Back to fare options
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
