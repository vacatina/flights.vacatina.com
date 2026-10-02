import { createHash } from "node:crypto"
import type { NewVisaListingRow, visaListingDocuments } from "@/lib/db/schema"
import {
  visaListingInputSchema,
  parseVisaListingFees,
  getListingPublishIssues,
  type VisaListingInput,
} from "../domain/listing"

/** Stable UUIDs make seed reruns predictable without changing existing records. */
export function seedId(key: string) {
  const hex = createHash("sha256")
    .update("vacatina-visa-dev:" + key)
    .digest("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export function createSeedRecord(input: VisaListingInput, now: Date) {
  const data = visaListingInputSchema.parse(input)
  const { documents, price, ...fields } = data
  // Decimal input is replaced by the validated minor-unit amount below.
  void price
  const fees = parseVisaListingFees(data)
  const issues = getListingPublishIssues({ ...data, ...fees })
  if (issues.length) throw new Error(issues.join(". "))
  const key = `${data.nationalityCode}:${data.destinationCode}:${data.code}`
  const listing: NewVisaListingRow = {
    ...fields,
    ...fees,
    id: seedId(key),
    status: "published",
    publishedAt: now,
    reviewedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  }
  const requirements: (typeof visaListingDocuments.$inferInsert)[] =
    documents.map((document, sortOrder) => ({
      ...document,
      id: seedId(key + ":document:" + sortOrder),
      listingId: listing.id,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    }))
  return { listing, documents: requirements }
}
