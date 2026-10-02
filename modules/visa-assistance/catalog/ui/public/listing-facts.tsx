import {
  Clock3,
  CalendarDays,
  CalendarRange,
  Repeat2,
  IdCard,
} from "lucide-react"
import {
  listingFacts,
  type PublicVisaListing,
} from "../../domain/public-listing"

const factIcons = {
  processingTimeText: Clock3,
  validityText: CalendarDays,
  maxStayText: CalendarRange,
  entriesText: Repeat2,
  passportValidityText: IdCard,
}

export function ListingFacts({ listing }: { listing: PublicVisaListing }) {
  const facts = listingFacts.filter(([key]) => listing[key]?.trim())
  if (!facts.length) return null
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {facts.map(([key, label]) => {
        const Icon = factIcons[key]
        return (
          <div
            key={key}
            className="min-w-0 rounded-xl border border-primary/10 bg-primary/[0.035] p-4"
          >
            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {label}
            </dt>
            <dd className="mt-1 font-medium [overflow-wrap:anywhere] whitespace-pre-line">
              {listing[key]}
            </dd>
          </div>
        )
      })}
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
