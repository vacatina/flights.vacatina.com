import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
            <p>
              Partial offer request: <code>{resolvedParams.partialOfferRequestId}</code>
            </p>
            <p>
              Selected full offer: <code>{selectedOfferId ?? "None"}</code>
            </p>
            <p>
              Selected partial offers: {" "}
              {selectedPartialOffers.length > 0
                ? selectedPartialOffers.join(", ")
                : "None"}
            </p>
            <div>
              <Button render={<Link href="/" />}>Start new search</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
