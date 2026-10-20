import { Suspense } from "react"

import { HeroSection } from "@/modules/home/ui/hero-section"
import { SearchCommandCenter } from "@/modules/home/ui/search-command-center"
import {
  PopularDestinationsSection,
  PopularDestinationsSkeleton,
} from "@/modules/home/ui/popular-destinations-section"
import {
  PopularFlightsSection,
  PopularFlightsSkeleton,
} from "@/modules/home/ui/popular-flights-section"
import { VisaAssistanceHomeSection } from "@/modules/home/ui/visa-assistance-home-section"
import { HolidayPackagesHomeSection } from "@/modules/home/ui/holiday-packages-home-section"
import { HotelDiscoveryHomeSection } from "@/modules/home/ui/hotel-discovery-home-section"
import { TravelConfidenceSection } from "@/modules/home/ui/travel-confidence-section"
import { TravelServicesSection } from "@/modules/home/ui/travel-services-section"
import { ExtendedTravelDiscoverySection } from "@/modules/home/ui/extended-travel-discovery-section"
import { SeasonalGuideSection } from "@/modules/home/ui/seasonal-guide-section"
import { NewsletterSection } from "@/modules/home/ui/newsletter-section"
import { parseSearchPrefillToken } from "@/modules/flights/search/domain"

interface HomePageProps {
  searchParams: Promise<{
    prefill?: string
  }>
}

export default async function Page({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams
  const initialFlightValues = parseSearchPrefillToken(resolvedSearchParams.prefill)

  return (
    <main id="main-content" className="bg-white">
      <HeroSection />
      <SearchCommandCenter initialFlightValues={initialFlightValues ?? undefined} />

      <div id="travel-inspiration">
        <Suspense fallback={<PopularDestinationsSkeleton />}>
          <PopularDestinationsSection />
        </Suspense>
      </div>

      <Suspense fallback={<PopularFlightsSkeleton />}>
        <PopularFlightsSection />
      </Suspense>

      <VisaAssistanceHomeSection />
      <HolidayPackagesHomeSection />
      <HotelDiscoveryHomeSection />
      <ExtendedTravelDiscoverySection />
      <SeasonalGuideSection />
      <TravelConfidenceSection />
      <TravelServicesSection />
      <NewsletterSection />
    </main>
  )
}
