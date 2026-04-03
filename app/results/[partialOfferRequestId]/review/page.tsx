import { ReviewPlaceholder } from "@/modules/flights/results/ui"

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
  const selectedRaw = resolvedSearchParams.selected
  const selected =
    typeof selectedRaw === "string"
      ? selectedRaw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : []

  return (
    <ReviewPlaceholder
      partialOfferRequestId={resolvedParams.partialOfferRequestId}
      selectedOfferIds={selected}
    />
  )
}
