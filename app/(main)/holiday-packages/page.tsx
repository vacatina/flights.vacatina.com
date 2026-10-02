import type { Metadata } from "next"
import { HolidayHero } from "@/modules/holidays/ui/holiday-hero"
import { HolidayListing } from "@/modules/holidays/ui/holiday-listing"
import { holidayImage } from "@/modules/holidays/domain/catalog"

export const metadata: Metadata = {
  title: "Sri Lanka Holiday Packages | Vacatina",
  description:
    "Discover 24 Sri Lanka holidays, from coastal escapes and cultural journeys to wildlife safaris. Explore your itinerary and plan a private holiday with Vacatina.",
}

export default function HolidayPackagesPage() {
  return (
    <main className="bg-primary/[0.035] dark:bg-background">
      <HolidayHero
        title="Holiday packages"
        description="Explore Sri Lanka's extraordinary places, with thoughtfully planned journeys for your kind of adventure."
        image={holidayImage("media/photos/2025-09-Bentota-2-scaled.jpg")!}
        alt="Palm-lined Sri Lankan coast and turquoise ocean"
      />
      <HolidayListing />
    </main>
  )
}
