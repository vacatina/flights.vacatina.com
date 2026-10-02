// @vitest-environment node
import { randomUUID } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "@/lib/db/schema"
import {
  EMPTY_LISTING_VALUES,
  toListingFormValues,
} from "../../catalog/domain/form-values"
import { applicationFixture } from "../testing/application-fixture"

vi.mock("server-only", () => ({}))
const context = vi.hoisted(() => ({
  db: null as NodePgDatabase<typeof schema> | null,
}))
vi.mock("@/lib/db/client", () => ({ getDbClient: () => context.db }))
vi.mock("./submission-notifications", () => ({
  enqueueVisaSubmissionNotification: vi.fn(async () => undefined),
}))
vi.mock("./r2-storage", () => ({
  createR2UploadUrl: vi.fn(async () => "https://storage.example/upload"),
  headR2Object: vi.fn(async () => ({
    ContentLength: 1024,
    ContentType: "application/pdf",
    ETag: "etag",
  })),
  deleteR2Object: vi.fn(async () => undefined),
  createR2DownloadUrl: vi.fn(async () => "https://storage.example/download"),
}))

import {
  saveVisaListing,
  unpublishVisaListing,
} from "../../catalog/server/repository"
import {
  createVisaApplicationDraft,
  getOwnedVisaApplication,
  saveVisaApplicationTrip,
  saveVisaApplicationTravelerDetails,
  saveVisaApplicationContact,
  submitVisaApplication,
} from "./application-service"
import {
  createVisaDocumentUpload,
  completeVisaDocumentUpload,
  deleteVisaApplicationDocument,
} from "./document-service"
import {
  getAdminVisaApplicationDetail,
  listOwnedVisaApplications,
  updateAdminVisaApplication,
} from "./application-repository"
import {
  getPublicVisaResults,
  getPublicVisaDetail,
} from "../../catalog/server/public-catalog"
import { getMissingRequiredDocuments } from "../domain"
import { headR2Object, deleteR2Object, createR2UploadUrl } from "./r2-storage"

describe.skipIf(!process.env.VISA_CATALOG_TEST_DATABASE_URL)(
  "manual visa application lifecycle",
  () => {
    it("freezes listings, prices travelers, validates slots, replaces files, and submits once", async () => {
      const pool = new Pool({
        connectionString: process.env.VISA_CATALOG_TEST_DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 10000,
        statement_timeout: 15000,
      })
      const db = drizzle(pool, { schema })
      const rollback = new Error("ROLLBACK_APPLICATION_TEST")
      const fetchSpy = vi.spyOn(globalThis, "fetch")
      try {
        await expect(
          db.transaction(async (tx) => {
            context.db = tx as unknown as NodePgDatabase<typeof schema>
            const actorUserId = randomUUID()
            await tx.insert(schema.users).values({
              id: actorUserId,
              clerkUserId: `visa-test-${actorUserId}`,
            })
            const listing = await saveVisaListing(
              {
                ...EMPTY_LISTING_VALUES,
                nationalityCode: "LK",
                destinationCode: "IN",
                code: `TEST-${randomUUID().slice(0, 8)}`,
                title: "Tourist visa",
                shortSummary: "Holiday assistance",
                fullDescription: "Original description",
                feeCurrency: "USD",
                governmentFee: "25",
                processingFee: "12.35",
                documentsReviewed: true,
                documents: [
                  { label: "Passport", required: true, scope: "per_traveler" },
                  {
                    label: "Itinerary",
                    required: true,
                    scope: "per_application",
                  },
                  {
                    label: "Extra details",
                    required: false,
                    scope: "per_application",
                  },
                ],
              },
              actorUserId,
              { publish: true }
            )
            expect(
              (await getPublicVisaResults("LK", "IN"))?.listings.some(
                (row) => row.id === listing.id
              )
            ).toBe(true)
            expect(
              (await getPublicVisaDetail("LK", "IN", listing.id))?.title
            ).toBe("Tourist visa")
            const application = await createVisaApplicationDraft({
              actorUserId,
              contactEmail: "visa-test@example.com",
              listingId: listing.id,
            })
            const applicationId = application.id
            const identity = { applicationId, actorUserId }
            expect(application.pricingSnapshot.totalMoney.amount).toBe("3735")
            await saveVisaListing(
              {
                ...toListingFormValues(listing),
                governmentFee: "90",
                fullDescription: "New description",
                documents: [],
              },
              actorUserId,
              { id: listing.id, publish: true }
            )
            await unpublishVisaListing(listing.id, actorUserId)
            expect(await getPublicVisaDetail("LK", "IN", listing.id)).toBeNull()
            await expect(
              createVisaApplicationDraft({
                actorUserId,
                contactEmail: null,
                listingId: listing.id,
              })
            ).rejects.toThrow("no longer available")

            await saveVisaApplicationTrip({
              ...identity,
              entryDate: "2099-01-01",
              travelerCount: 2,
            })
            let detail = await getOwnedVisaApplication(
              applicationId,
              actorUserId
            )
            expect(detail.application.pricingSnapshot.totalMoney.amount).toBe(
              "7470"
            )
            expect(detail.application.listingSnapshot.fullDescription).toBe(
              "Original description"
            )
            expect(detail.application.listingSnapshot.documents).toHaveLength(3)
            const pricedAt = detail.application.pricingSnapshot.pricedAt
            await saveVisaApplicationTrip({
              ...identity,
              entryDate: "2099-01-02",
              travelerCount: 2,
            })
            expect(
              (await getOwnedVisaApplication(applicationId, actorUserId))
                .application.pricingSnapshot.pricedAt
            ).toBe(pricedAt)
            await expect(
              saveVisaApplicationContact({
                ...identity,
                actorUserId: "someone-else",
                contactEmail: "x@example.com",
                contactPhone: "+94771234567",
              })
            ).rejects.toThrow("not found")
            await saveVisaApplicationTravelerDetails({
              ...identity,
              travelers: applicationFixture().travelers.map((traveler) => ({
                ...traveler,
                title: "Ms" as const,
              })),
            })
            await saveVisaApplicationContact({
              ...identity,
              contactEmail: "visa-test@example.com",
              contactPhone: "+94771234567",
            })
            detail = await getOwnedVisaApplication(applicationId, actorUserId)
            const passport = detail.application.listingSnapshot.documents[0]
            const itinerary = detail.application.listingSnapshot.documents[1]
            const metadata = {
              ...identity,
              requirementId: passport.id,
              travelerId: detail.travelers[0].id,
              originalFilename: "passport.pdf",
              mimeType: "application/pdf" as const,
              sizeBytes: 1024,
            }
            await expect(
              createVisaDocumentUpload({ ...metadata, travelerId: null })
            ).rejects.toThrow()
            await expect(
              createVisaDocumentUpload({
                ...metadata,
                travelerId: "foreign-traveler",
              })
            ).rejects.toThrow()
            await expect(
              createVisaDocumentUpload({
                ...metadata,
                requirementId: randomUUID(),
              })
            ).rejects.toThrow()
            const wrongOwnerSigns =
              vi.mocked(createR2UploadUrl).mock.calls.length
            await expect(
              createVisaDocumentUpload({
                ...metadata,
                actorUserId: "foreign-owner",
              })
            ).rejects.toThrow()
            expect(vi.mocked(createR2UploadUrl).mock.calls.length).toBe(
              wrongOwnerSigns
            )

            const consent = {
              ...identity,
              expectedPricedAt: pricedAt,
              informationAccurate: true,
              termsAccepted: true,
              privacyAccepted: true,
            }
            await expect(submitVisaApplication(consent)).rejects.toThrow(
              "required information"
            )
            const intent = await createVisaDocumentUpload(metadata)
            vi.mocked(headR2Object).mockResolvedValueOnce({
              $metadata: {},
              ContentLength: 99,
              ContentType: "application/pdf",
              ETag: "",
            })
            await expect(
              completeVisaDocumentUpload({
                ...identity,
                documentId: intent.document.id,
              })
            ).rejects.toThrow("did not match")
            expect(
              (await getOwnedVisaApplication(applicationId, actorUserId))
                .documents[0].status
            ).toBe("upload_failed")

            const uploaded = await createVisaDocumentUpload(metadata)
            await completeVisaDocumentUpload({
              ...identity,
              documentId: uploaded.document.id,
            })
            const replacement = await createVisaDocumentUpload(metadata)
            await completeVisaDocumentUpload({
              ...identity,
              documentId: replacement.document.id,
            })
            detail = await getOwnedVisaApplication(applicationId, actorUserId)
            expect(
              detail.documents.filter((d) => d.status === "uploaded")
            ).toHaveLength(1)
            vi.mocked(deleteR2Object).mockRejectedValueOnce(
              new Error("Storage unavailable")
            )
            await expect(
              deleteVisaApplicationDocument({
                ...identity,
                documentId: replacement.document.id,
              })
            ).rejects.toThrow("retry")
            expect(
              (
                await getOwnedVisaApplication(applicationId, actorUserId)
              ).documents.find((d) => d.id === replacement.document.id)?.status
            ).toBe("deletion_pending")
            await deleteVisaApplicationDocument({
              ...identity,
              documentId: replacement.document.id,
            })

            for (const travelerId of detail.travelers.map((t) => t.id)) {
              const upload = await createVisaDocumentUpload({
                ...metadata,
                travelerId,
              })
              await completeVisaDocumentUpload({
                ...identity,
                documentId: upload.document.id,
              })
            }
            const shared = await createVisaDocumentUpload({
              ...metadata,
              travelerId: null,
              requirementId: itinerary.id,
            })
            await completeVisaDocumentUpload({
              ...identity,
              documentId: shared.document.id,
            })
            detail = await getOwnedVisaApplication(applicationId, actorUserId)
            expect(getMissingRequiredDocuments(detail)).toHaveLength(0)
            await expect(
              submitVisaApplication({
                ...consent,
                expectedPricedAt: "2026-01-01T00:00:00Z",
              })
            ).rejects.toThrow("traveler count")
            const submitted = await submitVisaApplication(consent)
            expect(submitted.status).toBe("submitted")
            expect(submitted.pricingSnapshot.totalMoney.amount).toBe("7470")
            const dashboard = await listOwnedVisaApplications({
              ownerUserId: actorUserId,
              limit: 10,
              offset: 0,
            })
            expect(dashboard.total).toBe(1)
            expect(dashboard.items[0].status).toBe("submitted")
            expect(
              (
                await listOwnedVisaApplications({
                  ownerUserId: randomUUID(),
                  limit: 10,
                  offset: 0,
                })
              ).items
            ).toHaveLength(0)
            await expect(
              updateAdminVisaApplication({
                applicationId,
                actorUserId,
                status: "draft",
                internalNotes: null,
              })
            ).rejects.toThrow("cannot return to draft")
            const reviewed = await updateAdminVisaApplication({
              applicationId,
              actorUserId,
              status: "under_review",
              internalNotes: "Checking documents",
            })
            expect(reviewed?.status).toBe("under_review")
            await expect(submitVisaApplication(consent)).rejects.toThrow(
              "no longer be edited"
            )
            await expect(createVisaDocumentUpload(metadata)).rejects.toThrow(
              "no longer be edited"
            )
            await expect(
              deleteVisaApplicationDocument({
                ...identity,
                documentId: shared.document.id,
              })
            ).rejects.toThrow("no longer be edited")
            expect(
              (
                await getAdminVisaApplicationDetail(applicationId)
              )?.events.filter((e) => e.eventType === "application_submitted")
            ).toHaveLength(1)
            expect(fetchSpy).not.toHaveBeenCalled()
            throw rollback
          })
        ).rejects.toBe(rollback)
      } finally {
        context.db = null
        fetchSpy.mockRestore()
        await pool.end()
      }
    }, 240000)
  }
)
