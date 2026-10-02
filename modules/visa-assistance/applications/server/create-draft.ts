import "server-only"
import { and, asc, eq } from "drizzle-orm"
import { visaListings, visaListingDocuments } from "@/lib/db/schema"
import {
  createVisaApplicationSchema,
  createListingSnapshot,
  createApplicationPricing,
} from "../domain"
import { VisaApplicationError } from "../domain/application-error"
import { requireDb, createVisaApplication } from "./application-repository"
import { createVisaApplicationId, createVisaApplicationReference } from "./ids"
export async function createVisaApplicationDraft(input: {
  actorUserId: string
  contactEmail: string | null
  listingId: string
}) {
  const { listingId } = createVisaApplicationSchema.parse(input)
  return requireDb().transaction(async (transaction) => {
    const [listing] = await transaction
      .select()
      .from(visaListings)
      .where(
        and(
          eq(visaListings.id, listingId),
          eq(visaListings.status, "published")
        )
      )
      .for("share")
    if (!listing)
      throw new VisaApplicationError(
        "This visa listing is no longer available."
      )
    const documents = await transaction
      .select()
      .from(visaListingDocuments)
      .where(eq(visaListingDocuments.listingId, listingId))
      .orderBy(asc(visaListingDocuments.sortOrder))
    const listingSnapshot = createListingSnapshot({ ...listing, documents })
    return createVisaApplication(
      {
        id: createVisaApplicationId(),
        reference: createVisaApplicationReference(),
        ownerUserId: input.actorUserId,
        listingId,
        listingSnapshot,
        nationalityCode: listing.nationalityCode,
        destinationCode: listing.destinationCode,
        visaName: listing.title,
        contactEmail: input.contactEmail,
        pricingSnapshot: createApplicationPricing(listingSnapshot, 1),
      },
      transaction
    )
  })
}
