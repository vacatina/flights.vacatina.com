import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { parseReviewUrlState } from "@/modules/flights/results/domain"
import { fetchReviewPageData } from "@/modules/flights/results/server"
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
  const state = parseReviewUrlState(resolvedSearchParams)
  const result = await fetchReviewPageData({
    partialOfferRequestId: resolvedParams.partialOfferRequestId,
    state,
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((error) => {
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

  return <ReviewPageClient key={renderKey} data={result.data} />
}
