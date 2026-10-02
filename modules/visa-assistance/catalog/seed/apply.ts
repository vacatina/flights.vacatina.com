import { eq, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@/lib/db/schema"
import { VISA_SEED_LISTINGS } from "./listings"
import { createSeedRecord, seedId } from "./records"

export async function seedVisaListings(db: NodePgDatabase<typeof schema>) {
  const records = VISA_SEED_LISTINGS.map((input) =>
    createSeedRecord(input, new Date())
  )
  return db.transaction(async (tx) => {
    // Serialize reruns. Existing admin-edited records are never overwritten.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7400214)`)
    const results = []
    for (const record of records) {
      const [created] = await tx
        .insert(schema.visaListings)
        .values(record.listing)
        .onConflictDoNothing()
        .returning({ id: schema.visaListings.id })
      if (!created) {
        results.push({
          route: record.listing.destinationCode,
          result: "skipped",
        })
        continue
      }
      await tx.insert(schema.visaListingDocuments).values(record.documents)
      await tx.insert(schema.visaListingEvents).values(
        (["created", "published"] as const).map((eventType) => ({
          id: seedId(created.id + ":" + eventType),
          listingId: created.id,
          actorUserId: null,
          eventType,
        }))
      )
      const [saved] = await tx
        .select()
        .from(schema.visaListings)
        .where(eq(schema.visaListings.id, created.id))
      if (saved?.status !== "published")
        throw new Error("Seed verification failed")
      results.push({ route: record.listing.destinationCode, result: "created" })
    }
    return results
  })
}
