import type { HolidayPackage } from "../domain/types"
import { beyondBoundariesAdventure } from "./packages/beyond-boundaries-adventure"
import { coastalRomanceEscape } from "./packages/coastal-romance-escape"
import { colomboCityEscape } from "./packages/colombo-city-escape"
import { culturalOdysseyOfSriLanka } from "./packages/cultural-odyssey-of-sri-lanka"
import { easternCoastBlueEscape } from "./packages/eastern-coast-blue-escape"
import { familyIslandEscapade } from "./packages/family-island-escapade"
import { heritageLegacyGrandTour } from "./packages/heritage-legacy-grand-tour"
import { hillCountryCoastEscape } from "./packages/hill-country-coast-escape"
import { hillCountryRetreat } from "./packages/hill-country-retreat"
import { historicSriLankaJourney } from "./packages/historic-sri-lanka-journey"
import { intoSriLankasWild } from "./packages/into-sri-lankas-wild"
import { islandHighlightsEscape } from "./packages/island-highlights-escape"
import { loveCultureAdventure } from "./packages/love-culture-adventure"
import { magicalSriLankaFamilyJourney } from "./packages/magical-sri-lanka-family-journey"
import { romanticHillsHeritageRetreat } from "./packages/romantic-hills-heritage-retreat"
import { southernAdventureExplorer } from "./packages/southern-adventure-explorer"
import { southernSandsJourney } from "./packages/southern-sands-journey"
import { sriLankaExtendedDiscovery } from "./packages/sri-lanka-extended-discovery"
import { sriLankaGrandCircuit } from "./packages/sri-lanka-grand-circuit"
import { sunriseCoastCircuit } from "./packages/sunrise-coast-circuit"
import { ultimateIslandJourney } from "./packages/ultimate-island-journey"
import { ventureFurtherSriLanka } from "./packages/venture-further-sri-lanka"
import { wildSriLankaUncovered } from "./packages/wild-sri-lanka-uncovered"
import { wildTrailsDiscovery } from "./packages/wild-trails-discovery"

export const holidayPackages: HolidayPackage[] = [
  beyondBoundariesAdventure,
  coastalRomanceEscape,
  colomboCityEscape,
  culturalOdysseyOfSriLanka,
  easternCoastBlueEscape,
  familyIslandEscapade,
  heritageLegacyGrandTour,
  hillCountryCoastEscape,
  hillCountryRetreat,
  historicSriLankaJourney,
  intoSriLankasWild,
  islandHighlightsEscape,
  loveCultureAdventure,
  magicalSriLankaFamilyJourney,
  romanticHillsHeritageRetreat,
  southernAdventureExplorer,
  southernSandsJourney,
  sriLankaExtendedDiscovery,
  sriLankaGrandCircuit,
  sunriseCoastCircuit,
  ultimateIslandJourney,
  ventureFurtherSriLanka,
  wildSriLankaUncovered,
  wildTrailsDiscovery,
]

export const holidayPackageBySlug = Object.fromEntries(
  holidayPackages.map((holiday) => [holiday.slug, holiday])
) as Record<string, HolidayPackage>

export function getHolidayBySlug(slug: string) {
  return Object.hasOwn(holidayPackageBySlug, slug)
    ? holidayPackageBySlug[slug]
    : undefined
}

export function getHolidaysByCategory(category: string) {
  return holidayPackages.filter((holiday) => holiday.category === category)
}

export * from "./categories"
export * from "./packages"
