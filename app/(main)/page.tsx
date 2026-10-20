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

export default function Page() {
  return (
    <main id="main-content" className="bg-white">
      <HeroSection />
      <SearchCommandCenter />

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
      <TravelConfidenceSection />
      <TravelServicesSection />
    </main>
  )
}
