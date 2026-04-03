import { redirect } from "next/navigation"

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ partialOfferRequestId: string }>
}) {
  const { partialOfferRequestId } = await params
  redirect(`/results/${partialOfferRequestId}/fare-options`)
}
