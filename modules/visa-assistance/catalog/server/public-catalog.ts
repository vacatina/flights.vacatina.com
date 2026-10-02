import "server-only"

import { cache } from "react"
import { getVisaCountry } from "@/modules/visa-assistance/domain/countries"
import { toPublicVisaListing } from "../domain/public-listing"
import {
  getPublishedVisaListing,
  listPublishedVisaListings,
} from "./repository"

export async function getPublicVisaResults(
  nationality: string,
  destination: string
) {
  const passport = getVisaCountry(nationality)
  const arrival = getVisaCountry(destination)
  if (!passport || !arrival) return null

  const rows = await listPublishedVisaListings(passport.code, arrival.code)
  return {
    passport,
    destination: arrival,
    listings: rows.map(toPublicVisaListing),
  }
}

// Request-scoped memoization shares the read between metadata and the page.
// Publication status is checked on every request, not cached across requests.
export const getPublicVisaDetail = cache(
  async (nationality: string, destination: string, listingId: string) => {
    const passport = getVisaCountry(nationality)
    const arrival = getVisaCountry(destination)
    if (!passport || !arrival) return null

    const listing = await getPublishedVisaListing(listingId)
    if (
      !listing ||
      listing.nationalityCode !== passport.code ||
      listing.destinationCode !== arrival.code
    )
      return null

    return {
      ...toPublicVisaListing(listing),
      documents: listing.documents.map(
        ({ id, label, instructions, required, scope }) => ({
          id,
          label,
          instructions,
          required,
          scope,
        })
      ),
    }
  }
)
