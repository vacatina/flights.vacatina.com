// @vitest-environment node
import { randomUUID } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "@/lib/db/schema"
import {
  EMPTY_LISTING_VALUES,
  toListingFormValues,
} from "@/modules/visa-assistance/catalog/domain/form-values"

vi.mock("server-only", () => ({}))
const context = vi.hoisted(() => ({
  db: null as NodePgDatabase<typeof schema> | null,
}))
vi.mock("@/lib/db/client", () => ({ getDbClient: () => context.db }))

import {
  createVisaListing,
  getPublishedVisaListing,
  getVisaListing,
  listAdminVisaListings,
  listPublishedVisaListings,
  listVisaListingEvents,
  publishVisaListing,
  saveVisaListing,
  unpublishVisaListing,
  updateVisaListing,
} from "./repository"

// Opt-in integration run. Every fixture stays in one outer transaction that
// rolls back, including publications, so no test listings become visible.
describe.skipIf(!process.env.VISA_CATALOG_TEST_DATABASE_URL)(
  "visa catalog database lifecycle",
  () => {
    it("creates, edits, publishes, duplicates, filters, audits, and unpublishes atomically", async () => {
      const pool = new Pool({
        connectionString: process.env.VISA_CATALOG_TEST_DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 10000,
        statement_timeout: 15000,
      })
      const db = drizzle(pool, { schema })
      const rollback = new Error("ROLLBACK_CATALOG_TEST")
      const fetch = vi.spyOn(globalThis, "fetch")

      try {
        await expect(
          db.transaction(async (tx) => {
            context.db = tx as unknown as NodePgDatabase<typeof schema>
            const actorId = randomUUID()
            await tx
              .insert(schema.users)
              .values({ id: actorId, clerkUserId: `catalog-test-${actorId}` })
            const code = `TEST-${randomUUID().slice(0, 8).toUpperCase()}`
            const draft = await createVisaListing(
              {
                ...EMPTY_LISTING_VALUES,
                nationalityCode: "LK",
                destinationCode: "IN",
                code,
                documents: [
                  { label: "Passport", required: true, scope: "per_traveler" },
                  {
                    label: "Itinerary",
                    required: false,
                    scope: "per_application",
                  },
                ],
              },
              actorId
            )
            expect(draft.status).toBe("draft")
            expect(await getPublishedVisaListing(draft.id)).toBeNull()
            await expect(publishVisaListing(draft.id, actorId)).rejects.toThrow(
              "Add a public title"
            )
            await expect(
              createVisaListing(toListingFormValues(draft, true), actorId)
            ).rejects.toThrow()

            const edited = await updateVisaListing(
              draft.id,
              {
                ...toListingFormValues(draft),
                title: code,
                shortSummary: "Tourist visits",
                fullDescription: "Visa assistance for a holiday.",
                governmentFee: "0",
                processingFee: "12.35",
                documentsReviewed: true,
                documents: toListingFormValues(draft).documents.toReversed(),
              },
              actorId
            )
            expect(edited.governmentFeeMinor).toBe("0")
            expect(edited.processingFeeMinor).toBe("1235")
            expect(edited.documents.map((document) => document.id)).toEqual(
              draft.documents.map((document) => document.id).toReversed()
            )
            expect(
              edited.documents.map((document) => document.sortOrder)
            ).toEqual([0, 1])
            await expect(
              createVisaListing(
                { ...toListingFormValues(edited, true), code },
                actorId
              )
            ).rejects.toThrow("already exists")

            const published = await saveVisaListing(
              toListingFormValues(edited),
              actorId,
              { id: edited.id, publish: true }
            )
            expect(published.status).toBe("published")
            expect(await getPublishedVisaListing(draft.id)).not.toBeNull()
            expect(
              (await listPublishedVisaListings("LK", "IN")).some(
                (row) => row.id === draft.id
              )
            ).toBe(true)
            await expect(
              updateVisaListing(
                draft.id,
                { ...toListingFormValues(published), documentsReviewed: false },
                actorId
              )
            ).rejects.toThrow("Review the document checklist")
            expect((await getVisaListing(draft.id))?.documentsReviewed).toBe(
              true
            )

            const duplicate = await createVisaListing(
              { ...toListingFormValues(published, true), code: `${code}-COPY` },
              actorId
            )
            expect(duplicate.status).toBe("draft")
            expect(duplicate.documents[0].id).not.toBe(
              published.documents[0].id
            )
            expect(duplicate.documentsReviewed).toBe(false)
            const filtered = await listAdminVisaListings({
              search: code,
              status: "published",
            })
            expect(filtered.total).toBe(1)
            expect(filtered.rows[0].documentCount).toBe(2)

            await unpublishVisaListing(draft.id, actorId)
            expect(await getPublishedVisaListing(draft.id)).toBeNull()
            const events = await listVisaListingEvents(draft.id)
            expect(new Set(events.map((event) => event.eventType))).toEqual(
              new Set(["created", "updated", "published", "unpublished"])
            )
            expect(fetch).not.toHaveBeenCalled()
            throw rollback
          })
        ).rejects.toBe(rollback)
      } finally {
        context.db = null
        fetch.mockRestore()
        await pool.end()
      }
    }, 90000)
  }
)
