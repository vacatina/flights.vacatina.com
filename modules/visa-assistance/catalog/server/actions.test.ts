import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/modules/flights/cancellations/server/admin-guard", () => ({
  requireActiveAdmin: vi.fn(),
}))
vi.mock("./writes", () => ({
  saveVisaListing: vi.fn(),
  unpublishVisaListing: vi.fn(),
}))

import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import { EMPTY_LISTING_VALUES } from "@/modules/visa-assistance/catalog/domain/form-values"
import { saveVisaListingAction, unpublishVisaListingAction } from "./actions"
import { CatalogError } from "./database"
import { saveVisaListing, unpublishVisaListing } from "./writes"

const values = {
  ...EMPTY_LISTING_VALUES,
  nationalityCode: "LK",
  destinationCode: "IN",
  code: "TOURIST",
}

describe("visa catalog admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireActiveAdmin).mockResolvedValue({
      appUserId: "admin-1",
      clerkUserId: "clerk-1",
      email: "admin@example.test",
    })
  })

  it("checks admin access before saving or unpublishing", async () => {
    vi.mocked(requireActiveAdmin).mockRejectedValue(new Error("Access denied"))
    await expect(
      saveVisaListingAction({ values, intent: "save" })
    ).rejects.toThrow("Access denied")
    await expect(
      unpublishVisaListingAction("b6906f41-2416-4606-858f-a538fc7c294d")
    ).rejects.toThrow("Access denied")
    expect(saveVisaListing).not.toHaveBeenCalled()
    expect(unpublishVisaListing).not.toHaveBeenCalled()
  })

  it("returns field validation without writing invalid fees", async () => {
    const result = await saveVisaListingAction({
      intent: "save",
      values: { ...values, governmentFee: "1.001" },
    })
    expect(result).toMatchObject({
      ok: false,
      fields: [{ path: "governmentFee" }],
    })
    expect(saveVisaListing).not.toHaveBeenCalled()
  })

  it("returns a useful duplicate code error", async () => {
    vi.mocked(saveVisaListing).mockRejectedValue(
      new CatalogError("This visa code already exists", "code")
    )
    const result = await saveVisaListingAction({ values, intent: "save" })
    expect(result).toEqual({
      ok: false,
      message: "This visa code already exists",
      fields: [{ path: "code", message: "This visa code already exists" }],
    })
  })

  it("does not expose unexpected database errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(saveVisaListing).mockRejectedValue(
      new Error("private database error")
    )
    const result = await saveVisaListingAction({ values, intent: "save" })
    expect(result).toMatchObject({
      ok: false,
      message: "Could not save the listing. Please try again.",
    })
    log.mockRestore()
  })
})
