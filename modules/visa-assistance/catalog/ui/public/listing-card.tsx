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
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <h3 className="font-heading text-xl">{listing.title}</h3>
        </CardTitle>
        <CardDescription className="[overflow-wrap:anywhere] whitespace-pre-line">
          {listing.shortSummary}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <ListingFacts listing={listing} />
        <div className="mt-auto flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            Estimated total · per traveler
          </span>
          <Money
            money={total}
            className="text-2xl font-semibold tabular-nums"
          />
          <span className="text-xs text-muted-foreground">
            Includes government and Vacatina processing fees.
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
