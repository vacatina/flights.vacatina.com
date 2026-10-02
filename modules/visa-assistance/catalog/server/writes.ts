import "server-only"

import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

import { visaListings } from "@/lib/db/schema"
import {
  parseVisaListingFees,
  visaListingInputSchema,
  type VisaListingInput,
} from "@/modules/visa-assistance/catalog/domain/listing"
import { CatalogError, catalogDatabase, catalogWriteError } from "./database"
import {
  assertPublishable,
  listingValues,
  recordCatalogEvent,
  replaceDocuments,
} from "./write-helpers"

export function createVisaListing(input: VisaListingInput, actorId: string) {
  return saveVisaListing(input, actorId)
}

export function updateVisaListing(
  id: string,
  input: VisaListingInput,
  actorId: string
) {
  return saveVisaListing(input, actorId, { id })
}

export async function saveVisaListing(
  input: VisaListingInput,
  actorId: string,
  options: { id?: string; publish?: boolean } = {}
) {
  const data = visaListingInputSchema.parse(input)
  const values = { ...listingValues(data), ...parseVisaListingFees(data) }
  const id = options.id ?? randomUUID()

  try {
    return await catalogDatabase().transaction(async (tx) => {
      const [existing] = options.id
        ? await tx
            .select()
            .from(visaListings)
            .where(eq(visaListings.id, id))
            .for("update")
        : []
      if (options.id && !existing)
        throw new CatalogError("Visa listing not found")
      if (!existing && data.documents.some((document) => document.id)) {
        throw new CatalogError(
          "New listings must use new document requirements"
        )
      }

      const published = options.publish || existing?.status === "published"
      if (published) assertPublishable(values)
      const now = new Date()
      const write = {
        ...values,
        status: published ? ("published" as const) : ("draft" as const),
        reviewedAt: published ? now : null,
        publishedAt: published ? (existing?.publishedAt ?? now) : null,
        updatedAt: now,
        updatedBy: actorId,
      }

      const [listing] = existing
        ? await tx
            .update(visaListings)
            .set(write)
            .where(eq(visaListings.id, id))
            .returning()
        : await tx
            .insert(visaListings)
            .values({ ...write, id, createdBy: actorId })
            .returning()
      if (!listing) throw new CatalogError("Could not save visa listing")

      const documents = await replaceDocuments(tx, id, data.documents)
      await recordCatalogEvent(
        tx,
        id,
        actorId,
        existing ? "updated" : "created"
      )
      if (published && existing?.status !== "published") {
        await recordCatalogEvent(tx, id, actorId, "published")
      }
      return { ...listing, documents }
    })
  } catch (error) {
    catalogWriteError(error)
  }
}

export function publishVisaListing(id: string, actorId: string) {
  return setPublication(id, actorId, true)
}

export function unpublishVisaListing(id: string, actorId: string) {
  return setPublication(id, actorId, false)
}

async function setPublication(id: string, actorId: string, published: boolean) {
  return catalogDatabase().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(visaListings)
      .where(eq(visaListings.id, id))
      .for("update")
    if (!existing) throw new CatalogError("Visa listing not found")
    if (published) assertPublishable(existing)

    const now = new Date()
    const [listing] = await tx
      .update(visaListings)
      .set({
        status: published ? "published" : "draft",
        publishedAt: published ? (existing.publishedAt ?? now) : null,
        reviewedAt: published ? now : existing.reviewedAt,
        updatedAt: now,
        updatedBy: actorId,
      })
      .where(eq(visaListings.id, id))
      .returning()

    if (existing.status !== listing.status) {
      await recordCatalogEvent(
        tx,
        id,
        actorId,
        published ? "published" : "unpublished"
      )
    }
    return listing
  })
}
