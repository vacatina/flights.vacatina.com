import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>
          <h2>Estimated fees</h2>
        </CardTitle>
        <CardDescription>Per traveler · no online payment</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="flex flex-col gap-4">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-sm text-muted-foreground">Government fee</dt>
            <dd>
              <Money money={fees.government} />
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-sm text-muted-foreground">
              Vacatina processing fee
            </dt>
            <dd>
              <Money money={fees.processing} />
            </dd>
          </div>
        </dl>
        <Separator />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            Estimated total per traveler
          </span>
          <Money
            money={fees.total}
            className="text-3xl font-semibold tabular-nums"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          For multiple travelers, fees apply to each traveler. Our team will
          confirm the final quote before you pay.
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
