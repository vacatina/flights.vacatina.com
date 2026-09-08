import { redirect } from "next/navigation"
import { logFlightFlow } from "@/lib/logging/flow-debug"

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ partialOfferRequestId: string }>
}) {
  const { partialOfferRequestId } = await params
  logFlightFlow("resultsPage", "redirect_to_fare_options", {
    partialOfferRequestId,
  })
  redirect(`/results/${partialOfferRequestId}/fare-options`)
}
