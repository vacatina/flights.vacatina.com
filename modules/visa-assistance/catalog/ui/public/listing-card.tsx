import { IdCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { visaPanel } from "./visa-surfaces"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Money } from "@/modules/currency/ui/money"
import {
  publicListingFees,
  publicListingPath,
  type PublicVisaListing,
} from "../../domain/public-listing"
import { ListingFacts, ListingReviewedDate } from "./listing-facts"
import { ListingLink } from "./listing-link"

export function PublicListingCard({ listing }: { listing: PublicVisaListing }) {
  const { total } = publicListingFees(listing)
  return (
    <Card
      className={cn(
        visaPanel,
        "relative flex h-full flex-col transition-shadow duration-300 hover:shadow-[0_22px_48px_-26px_rgba(10,19,69,0.4)]"
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/25 via-primary to-primary/25"
      />
      <CardHeader className="gap-3">
        <span className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <IdCard className="size-6" aria-hidden="true" />
        </span>
        <CardTitle>
          <h3 className="font-heading text-2xl">{listing.title}</h3>
        </CardTitle>
        <CardDescription className="[overflow-wrap:anywhere] whitespace-pre-line">
          {listing.shortSummary}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <ListingFacts listing={listing} />
        <div className="mt-auto flex flex-col gap-2 rounded-2xl border border-primary/10 bg-primary/5 p-5">
          <span className="text-xs text-muted-foreground">
            Estimated total · per traveler
          </span>
          <Money
            money={total}
            className="text-2xl font-semibold tabular-nums"
          />
          <span className="text-xs text-muted-foreground">
            One complete estimate. Our team confirms the final quote.
          </span>
        </div>
        <ListingReviewedDate value={listing.reviewedAt} />
      </CardContent>
      <CardFooter>
        <ListingLink href={publicListingPath(listing)} />
      </CardFooter>
    </Card>
  )
}
