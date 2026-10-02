import { beforeEach, describe, expect, it, vi } from "vitest"
import { listingFixture } from "../testing/listing-fixture"

vi.mock("server-only", () => ({}))
vi.mock("./repository", () => ({
  getPublishedVisaListing: vi.fn(),
  listPublishedVisaListings: vi.fn(),
}))
import {
  getPublishedVisaListing,
  listPublishedVisaListings,
} from "./repository"
import { getPublicVisaDetail, getPublicVisaResults } from "./public-catalog"

beforeEach(() => vi.resetAllMocks())

describe("public database catalog", () => {
  it("normalizes routes and returns multiple manually authored visa types", async () => {
    vi.mocked(listPublishedVisaListings).mockResolvedValue([
      listingFixture(),
      listingFixture({ id: "business-id", title: "Business visa" }),
    ])
    const result = await getPublicVisaResults(" lk ", "in")
    expect(listPublishedVisaListings).toHaveBeenCalledWith("LK", "IN")
    expect(result?.listings.map((row) => row.title)).toEqual([
      "India tourist visa",
      "Business visa",
    ])
  })
  it("returns an empty service list without any external fetch on a miss", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
    vi.mocked(listPublishedVisaListings).mockResolvedValue([])
    try {
      expect((await getPublicVisaResults("LK", "IN"))?.listings).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      fetch.mockRestore()
    }
  })
  it("rejects invalid countries before database reads", async () => {
    expect(await getPublicVisaResults("INVALID", "IN")).toBeNull()
    expect(await getPublicVisaDetail("LK", "INVALID", "id")).toBeNull()
    expect(listPublishedVisaListings).not.toHaveBeenCalled()
    expect(getPublishedVisaListing).not.toHaveBeenCalled()
  })
  it("reads details using the published-only repository, not admin reads", async () => {
    vi.mocked(getPublishedVisaListing).mockResolvedValue({
      ...listingFixture(),
      documents: [],
    })
    const listing = await getPublicVisaDetail("lk", "in", "id")
    expect(getPublishedVisaListing).toHaveBeenCalledWith("id")
    expect(listing?.documents).toEqual([])
    expect(listing).not.toHaveProperty("createdBy")
  })
  it("does not expose draft, unpublished, unknown, or wrong-route details", async () => {
    vi.mocked(getPublishedVisaListing).mockResolvedValue(null)
    expect(await getPublicVisaDetail("LK", "IN", "draft-id")).toBeNull()
    vi.mocked(getPublishedVisaListing).mockResolvedValue({
      ...listingFixture(),
      documents: [],
    })
    expect(await getPublicVisaDetail("US", "IN", "id")).toBeNull()
    expect(await getPublicVisaDetail("LK", "US", "id")).toBeNull()
  })
})
