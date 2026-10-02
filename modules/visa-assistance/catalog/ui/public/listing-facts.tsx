import {
  listingFacts,
  type PublicVisaListing,
} from "../../domain/public-listing"

export function ListingFacts({ listing }: { listing: PublicVisaListing }) {
  const facts = listingFacts.filter(([key]) => listing[key]?.trim())
  if (!facts.length) return null
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {facts.map(([key, label]) => (
        <div key={key} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-medium [overflow-wrap:anywhere] whitespace-pre-line">
            {listing[key]}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function ListingReviewedDate({ value }: { value: string | null }) {
  if (!value) return null
  const label = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))
  return (
    <p className="text-xs text-muted-foreground">
      Reviewed by Vacatina <time dateTime={value}>{label}</time>
    </p>
  )
}
