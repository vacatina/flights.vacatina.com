import "server-only"

import { and, asc, eq } from "drizzle-orm"

import {
  visaListingDocuments,
  visaListings,
  type VisaListingDocumentRow,
  type VisaListingRow,
} from "@/lib/db/schema"
import { catalogDatabase } from "./database"

export { listAdminVisaListings, listVisaListingEvents } from "./admin-queries"
export {
  createVisaListing,
  updateVisaListing,
  saveVisaListing,
  publishVisaListing,
  unpublishVisaListing,
} from "./writes"

export type VisaListing = VisaListingRow & {
  documents: VisaListingDocumentRow[]
}

export async function getVisaListing(id: string): Promise<VisaListing | null> {
  return readListing(id, false)
}

export async function getPublishedVisaListing(id: string) {
  return readListing(id, true)
}

async function readListing(id: string, publishedOnly: boolean) {
  const db = catalogDatabase()
  const [listing] = await db
    .select()
    .from(visaListings)
    .where(
      and(
        eq(visaListings.id, id),
        publishedOnly ? eq(visaListings.status, "published") : undefined
      )
    )
    .limit(1)
  if (!listing) return null

  const documents = await db
    .select()
    .from(visaListingDocuments)
    .where(eq(visaListingDocuments.listingId, id))
    .orderBy(asc(visaListingDocuments.sortOrder))
  return { ...listing, documents }
}

export async function listPublishedVisaListings(
  nationalityCode: string,
  destinationCode: string
) {
  return catalogDatabase()
    .select()
    .from(visaListings)
    .where(
      and(
        eq(visaListings.status, "published"),
        eq(visaListings.nationalityCode, nationalityCode.trim().toUpperCase()),
        eq(visaListings.destinationCode, destinationCode.trim().toUpperCase())
      )
    )
    .orderBy(asc(visaListings.title), asc(visaListings.code))
}
