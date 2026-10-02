import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

import { visaListingDocuments, visaListingEvents } from "@/lib/db/schema"
import {
  getListingPublishIssues,
  type ParsedVisaListingInput,
} from "@/modules/visa-assistance/catalog/domain/listing"
import { CatalogError, type CatalogTransaction } from "./database"

export function listingValues(data: ParsedVisaListingInput) {
  return {
    nationalityCode: data.nationalityCode,
    destinationCode: data.destinationCode,
    code: data.code,
    title: data.title,
    shortSummary: data.shortSummary,
    fullDescription: data.fullDescription,
    eligibilityNotes: data.eligibilityNotes || null,
    processingTimeText: data.processingTimeText || null,
    validityText: data.validityText || null,
    maxStayText: data.maxStayText || null,
    entriesText: data.entriesText || null,
    passportValidityText: data.passportValidityText || null,
    additionalNotes: data.additionalNotes || null,
    documentsReviewed: data.documentsReviewed,
  }
}

export function assertPublishable(
  input: Parameters<typeof getListingPublishIssues>[0]
) {
  const issues = getListingPublishIssues(input)
  if (issues.length) throw new CatalogError(issues.join(". "))
}

export async function replaceDocuments(
  tx: CatalogTransaction,
  listingId: string,
  documents: ParsedVisaListingInput["documents"]
) {
  const previous = await tx
    .select()
    .from(visaListingDocuments)
    .where(eq(visaListingDocuments.listingId, listingId))
  const byId = new Map(previous.map((document) => [document.id, document]))

  if (documents.some((document) => document.id && !byId.has(document.id))) {
    throw new CatalogError("A document does not belong to this listing")
  }

  // Reinsert in one transaction so swapping positions cannot hit the unique index.
  // Preserve requirement IDs and their original creation times.
  await tx
    .delete(visaListingDocuments)
    .where(eq(visaListingDocuments.listingId, listingId))
  if (!documents.length) return []

  return tx
    .insert(visaListingDocuments)
    .values(
      documents.map((document, sortOrder) => ({
        id: document.id ?? randomUUID(),
        listingId,
        label: document.label,
        instructions: document.instructions || null,
        required: document.required,
        scope: document.scope,
        sortOrder,
        createdAt: document.id ? byId.get(document.id)?.createdAt : undefined,
        updatedAt: new Date(),
      }))
    )
    .returning()
}

export async function recordCatalogEvent(
  tx: CatalogTransaction,
  listingId: string,
  actorUserId: string,
  eventType: typeof visaListingEvents.$inferInsert.eventType
) {
  await tx.insert(visaListingEvents).values({
    id: randomUUID(),
    listingId,
    actorUserId,
    eventType,
    createdAt: new Date(),
  })
}
