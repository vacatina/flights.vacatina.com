import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActorContext } from "@/modules/auth/server"
import { getAuthServerConfig } from "@/modules/auth/server/config"
import {
  formatCurrencyAmount,
  validatePricedQuote,
} from "@/modules/flights/pricing/server"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

interface CheckoutPlaceholderPageProps {
  params: Promise<{
    partialOfferRequestId: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CheckoutPlaceholderPage({
  params,
  searchParams,
}: CheckoutPlaceholderPageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  const { clerkEnabled } = getAuthServerConfig()
  const actor = await getActorContext({
    ensureGuestSession: false,
  })
  const selectedOfferId =
    typeof resolvedSearchParams.offer === "string"
      ? resolvedSearchParams.offer
      : undefined
  const selectedPartialOffers =
    typeof resolvedSearchParams.selected === "string"
      ? resolvedSearchParams.selected
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : []
  const quoteId =
    typeof resolvedSearchParams.quote === "string"
      ? resolvedSearchParams.quote
      : undefined

  const quoteValidation =
    quoteId && selectedOfferId && selectedPartialOffers.length > 0
      ? await validatePricedQuote({
          quoteId,
          partialOfferRequestId: resolvedParams.partialOfferRequestId,
          offerId: selectedOfferId,
          selectedPartialOffers,
          owner:
            actor.type === "user"
              ? {
                  userId: actor.appUserId,
                  guestId: null,
                }
              : {
                  userId: null,
                  guestId:
                    actor.guestId !== "guest_unavailable" ? actor.guestId : null,
                },
        })
      : null

  logFlightFlow("CheckoutPlaceholderPage", "rendered", {
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    selectedOfferId: selectedOfferId ?? null,
    selectedPartialOfferCount: selectedPartialOffers.length,
    quoteId: quoteId ?? null,
    actorType: actor.type,
    quoteValidationOk: quoteValidation?.ok ?? null,
    quoteValidationReason: quoteValidation?.reason ?? null,
  })

  if (quoteId && quoteValidation && !quoteValidation.ok) {
    const reviewParams = new URLSearchParams()
    reviewParams.set("selected", selectedPartialOffers.join(","))

    return (
      <main className="min-h-svh bg-muted/40 py-10">
        <div className="mx-auto w-full max-w-2xl px-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Checkout quote expired</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                {toQuoteFailureMessage(quoteValidation.reason)}
              </p>
              <Button
                className="w-fit"
                render={
                  <Link
                    href={`/results/${resolvedParams.partialOfferRequestId}/review?${reviewParams.toString()}`}
                  />
                }
              >
                Back to fare options
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-muted/40 py-10">
      <div className="mx-auto w-full max-w-4xl px-4 md:px-8">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Checkout step placeholder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Booking checkout will be implemented in the next phase.
            </p>
            {quoteValidation?.ok && quoteValidation.quote ? (
              <p>
                Locked total amount: {" "}
                <strong>
                  {formatCurrencyAmount(
                    quoteValidation.quote.sellAmount,
                    quoteValidation.quote.currency
                  )}
                </strong>
              </p>
            ) : (
              <p>No locked quote attached yet.</p>
            )}
            <p>
              Partial offer request: <code>{resolvedParams.partialOfferRequestId}</code>
            </p>
            <p>
              Selected full offer: <code>{selectedOfferId ?? "None"}</code>
            </p>
            <p>
              Quote ID: <code>{quoteId ?? "None"}</code>
            </p>
            <p>
              Selected partial offers: {" "}
              {selectedPartialOffers.length > 0
                ? selectedPartialOffers.join(", ")
                : "None"}
            </p>
            {clerkEnabled && actor.type === "guest" ? (
              <p>
                Sign in for faster checkout and future order history.{" "}
                <Link
                  href={`/sign-in?redirect_url=${encodeURIComponent(getCurrentCheckoutPath(resolvedParams.partialOfferRequestId, resolvedSearchParams))}`}
                  className="text-primary underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            ) : null}
            <div>
              <Button render={<Link href="/" />}>Start new search</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function toQuoteFailureMessage(reason: string | null) {
  switch (reason) {
    case "not_found":
      return "The checkout quote was not found. Please generate a new quote from review."
    case "not_active":
      return "This checkout quote is no longer active. Please generate a new quote."
    case "expired":
      return "This checkout quote expired. Please return to review and continue to checkout again."
    case "partial_offer_request_mismatch":
    case "offer_mismatch":
    case "selected_mismatch":
    case "owner_mismatch":
      return "The quote does not match the selected fare state. Please regenerate from review."
    default:
      return "The checkout quote is invalid. Please generate a fresh quote."
  }
}

function getCurrentCheckoutPath(
  partialOfferRequestId: string,
  searchParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value)
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
    }
  }

  const suffix = params.toString()
  const basePath = `/results/${partialOfferRequestId}/checkout`

  return suffix ? `${basePath}?${suffix}` : basePath
}
