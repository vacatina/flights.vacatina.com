import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/modules/flights/cancellations/server/admin-guard", () => ({
  requireActiveAdmin: vi.fn(),
}))
vi.mock("@/modules/visa-assistance/catalog/server/repository", () => ({
  getVisaListing: vi.fn(),
  listVisaListingEvents: vi.fn(),
}))
vi.mock("@/modules/visa-assistance/catalog/server/admin-queries", () => ({
  listAdminVisaListings: vi.fn(),
}))
vi.mock("@/modules/admin/ui/admin-panel-shell", () => ({
  AdminPanelShell: vi.fn(),
}))
vi.mock("@/modules/visa-assistance/catalog/ui/listing-directory", () => ({
  VisaListingDirectory: vi.fn(),
}))
vi.mock("@/modules/visa-assistance/catalog/ui/listing-editor", () => ({
  VisaListingEditor: vi.fn(),
}))
vi.mock("@/modules/visa-assistance/catalog/ui/audit-timeline", () => ({
  VisaListingAuditTimeline: vi.fn(),
}))

import VisaListingsPage from "@/app/admin/visa-listings/page"
import NewVisaListingPage from "@/app/admin/visa-listings/new/page"
import EditVisaListingPage from "@/app/admin/visa-listings/[listingId]/page"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import { getVisaListing, listVisaListingEvents } from "./repository"
import { listAdminVisaListings } from "./admin-queries"

describe("catalog page authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireActiveAdmin).mockRejectedValue(new Error("Access denied"))
  })

  it("blocks directory, draft details, and duplication reads before querying", async () => {
    await expect(
      VisaListingsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("Access denied")
    await expect(
      NewVisaListingPage({
        searchParams: Promise.resolve({ duplicate: "draft-id" }),
      })
    ).rejects.toThrow("Access denied")
    await expect(
      EditVisaListingPage({
        params: Promise.resolve({ listingId: "draft-id" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("Access denied")
    expect(getVisaListing).not.toHaveBeenCalled()
    expect(listVisaListingEvents).not.toHaveBeenCalled()
    expect(listAdminVisaListings).not.toHaveBeenCalled()
  })
})
