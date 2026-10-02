import { FileSearchIcon } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { FxEstimateDisclosure } from "@/modules/currency/ui/fx-estimate-disclosure"
import type { PublicVisaListing } from "../../domain/public-listing"
import type { VisaCountry } from "@/modules/visa-assistance/domain/countries"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"
import { PublicListingCard } from "./listing-card"
import { VisaRouteHeading } from "./route-heading"

export function PublicVisaResults({
  passport,
  destination,
  listings,
}: {
  passport: VisaCountry
  destination: VisaCountry
  listings: PublicVisaListing[]
}) {
  return (
    <main>
      <VisaRouteHeading
        nationality={passport.code}
        destination={destination.code}
        title={`Visa assistance for ${destination.name}`}
        description={`Explore our available visa services for ${passport.name} passport holders. Review the details and estimated fees before contacting our team.`}
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:px-8 md:py-14">
        <section
          aria-labelledby="visa-options-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h2
              id="visa-options-heading"
              className="font-heading text-2xl font-semibold"
            >
              Available visa services
            </h2>
            <p className="text-sm text-muted-foreground">
              No online payment is required. Our team will confirm eligibility
              and your final quote.
            </p>
          </div>
          {listings.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {listings.map((listing) => (
                <PublicListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <Empty className="rounded-xl border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileSearchIcon />
                </EmptyMedia>
                <EmptyTitle>
                  Visa assistance not offered for this route
                </EmptyTitle>
                <EmptyDescription>
                  We don’t currently list a service for this passport country
                  and destination. This does not mean a visa is unnecessary.
                  Check official entry requirements before traveling.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <FxEstimateDisclosure
            finalChargeNote="Our team will confirm the final quote and currency."
            sourceCurrencies={listings.flatMap((listing) =>
              listing.feeCurrency ? [listing.feeCurrency] : []
            )}
          />
        </section>
        <section
          className="grid gap-6 rounded-xl bg-muted/30 p-5 md:p-8 lg:grid-cols-2"
          aria-labelledby="change-trip-heading"
        >
          <div className="flex flex-col gap-2">
            <h2
              id="change-trip-heading"
              className="font-heading text-2xl font-semibold"
            >
              Planning another trip?
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose a passport country and destination to explore our services.
            </p>
          </div>
          <VisaSearchForm
            key={`${passport.code}-${destination.code}`}
            compact
            initialValues={{
              nationality: passport.code,
              destination: destination.code,
            }}
          />
        </section>
      </div>
    </main>
  )
}
