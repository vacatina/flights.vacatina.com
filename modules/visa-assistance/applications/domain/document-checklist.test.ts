import { describe, expect, it } from "vitest"
import {
  applicationFixture,
  documentFixture,
  requirementId,
  sharedRequirementId,
} from "../testing/application-fixture"
import {
  assertDocumentSlot,
  getDocumentSlots,
  getMissingRequiredDocuments,
} from "./document-checklist"

describe("snapshot document checklist", () => {
  it("creates two traveler slots and one shared slot", () => {
    const slots = getDocumentSlots(applicationFixture())
    expect(slots).toHaveLength(3)
    expect(new Set(slots.map((slot) => slot.key)).size).toBe(3)
    expect(slots.filter((slot) => slot.travelerId === null)).toHaveLength(1)
  })
  it("only accepts verified files attached to the correct application and slot", () => {
    const detail = applicationFixture()
    detail.documents = [
      documentFixture(),
      documentFixture({ id: "d2", travelerId: "traveler-1" }),
      documentFixture({
        id: "d3",
        travelerId: null,
        requirementId: sharedRequirementId,
      }),
    ]
    expect(getMissingRequiredDocuments(detail)).toHaveLength(0)
    for (const status of [
      "pending_upload",
      "upload_failed",
      "deletion_pending",
      "deleted",
    ] as const) {
      expect(
        getMissingRequiredDocuments({
          ...detail,
          documents: detail.documents.map((d) => ({ ...d, status })),
        })
      ).toHaveLength(3)
    }
    expect(
      getMissingRequiredDocuments({
        ...detail,
        documents: [documentFixture({ applicationId: "other" })],
      })
    ).toHaveLength(3)
  })
  it("rejects unknown requirements, wrong travelers, and wrong scopes", () => {
    const detail = applicationFixture()
    expect(() => assertDocumentSlot(detail, requirementId, "other")).toThrow()
    expect(() => assertDocumentSlot(detail, requirementId, null)).toThrow()
    expect(() =>
      assertDocumentSlot(detail, sharedRequirementId, "traveler-0")
    ).toThrow()
    expect(() => assertDocumentSlot(detail, "unknown", null)).toThrow()
  })
  it("does not require optional files or invent passport requirements", () => {
    const detail = applicationFixture()
    detail.application.listingSnapshot.documents =
      detail.application.listingSnapshot.documents.map((d) => ({
        ...d,
        required: false,
      }))
    expect(getMissingRequiredDocuments(detail)).toHaveLength(0)
    detail.application.listingSnapshot.documents = []
    expect(getDocumentSlots(detail)).toHaveLength(0)
  })
})
