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
import { StartVisaRequest } from "./start-request"
import { Money } from "@/modules/currency/ui/money"
import { FxEstimateDisclosure } from "@/modules/currency/ui/fx-estimate-disclosure"
import {
  publicListingFees,
  type PublicVisaListing,
} from "../../domain/public-listing"

export function ListingFeeSummary({ listing }: { listing: PublicVisaListing }) {
  const fees = publicListingFees(listing)
  return (
    <Card className={cn(visaPanel, "relative lg:sticky lg:top-28")}>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/25 via-primary to-primary/25"
      />
      <CardHeader>
        <CardTitle>
          <h2>Estimated price</h2>
        </CardTitle>
        <CardDescription>Per traveler · no online payment</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/10 bg-primary/5 p-5">
          <span className="text-sm text-muted-foreground">
            Estimated total per traveler
          </span>
          <Money
            money={fees.total}
            className="text-3xl font-semibold tabular-nums"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          For multiple travelers, the price applies to each traveler. Our team
          will confirm the final quote before you pay.
        </p>
        <FxEstimateDisclosure
          sourceCurrencies={[fees.total.currency]}
          finalChargeNote="Our team will confirm the final quote and currency."
        />
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <StartVisaRequest listingId={listing.id} />
        <p className="text-xs text-muted-foreground">
          No payment now. Our team will review your request and confirm the
          final quote.
        </p>
      </CardFooter>
    </Card>
  )
}
