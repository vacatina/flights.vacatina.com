import { Suspense } from "react"
import { HeroSection } from "@/modules/home/ui/hero-section"
import {
  PopularDestinationsSection,
  PopularDestinationsSkeleton,
} from "@/modules/home/ui/popular-destinations-section"
import {
  PopularFlightsSection,
  PopularFlightsSkeleton,
} from "@/modules/home/ui/popular-flights-section"
import { TravelServicesSection } from "@/modules/home/ui/travel-services-section"
import { TravelConfidenceSection } from "@/modules/home/ui/travel-confidence-section"
import { parseSearchPrefillToken } from "@/modules/flights/search/domain"

interface HomePageProps {
  searchParams: Promise<{
    prefill?: string
  }>
}

export default async function Page({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams
  const initialValues = parseSearchPrefillToken(resolvedSearchParams.prefill)

  return (
    <main className="bg-background">
      <HeroSection initialValues={initialValues ?? undefined} />
      <Suspense fallback={<PopularDestinationsSkeleton />}>
        <PopularDestinationsSection />
      </Suspense>
      <Suspense fallback={<PopularFlightsSkeleton />}>
        <PopularFlightsSection />
      </Suspense>
      <TravelServicesSection />
      <TravelConfidenceSection />
    </main>
  )
}
