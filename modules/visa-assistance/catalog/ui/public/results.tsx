import { cn } from "@/lib/utils"
import { VisaNextSteps } from "./visa-next-steps"
import { VisaTripSearch } from "./visa-trip-search"
import { visaPanel } from "./visa-surfaces"
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
    <main className="bg-primary/[0.035]">
      <VisaRouteHeading
        compact
        nationality={passport.code}
        destination={destination.code}
        title={`Visa assistance for ${destination.name}`}
        description={`Explore our available visa services for ${passport.name} passport holders. Review the details and estimated fees before contacting our team.`}
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-12 px-5 py-7 sm:px-8 md:py-8">
        <section
          aria-labelledby="visa-options-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h2
              id="visa-options-heading"
              className="font-heading text-3xl font-normal tracking-tight sm:text-4xl"
            >
              Available visa services
            </h2>
            <p className="text-sm text-muted-foreground">
              No online payment is required. Our team will confirm eligibility
              and your final quote.
            </p>
          </div>
          <div
            className={cn(
              "grid gap-7",
              listings.length > 0 && "lg:grid-cols-[minmax(0,1fr)_340px]"
            )}
          >
            {listings.length ? (
              <div
                className={cn(
                  "grid gap-6",
                  listings.length > 1 &&
                    "md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
                )}
              >
                {listings.map((listing) => (
                  <PublicListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <Empty className={visaPanel}>
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
            {!!listings.length && <VisaNextSteps />}
          </div>
          <FxEstimateDisclosure
            finalChargeNote="Our team will confirm the final quote and currency."
            sourceCurrencies={listings.flatMap((listing) =>
              listing.feeCurrency ? [listing.feeCurrency] : []
            )}
          />
        </section>
        <VisaTripSearch
          nationality={passport.code}
          destination={destination.code}
        />
      </div>
    </main>
  )
}
