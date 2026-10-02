import { beforeEach, describe, expect, it, vi } from "vitest"
import { listingFixture } from "../testing/listing-fixture"
import { toPublicVisaListing } from "../domain/public-listing"

vi.mock("server-only", () => ({}))
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
vi.mock("./public-catalog", () => ({
  getPublicVisaDetail: vi.fn(),
  getPublicVisaResults: vi.fn(),
}))
vi.mock("../ui/public/results", () => ({ PublicVisaResults: () => null }))
vi.mock("../ui/public/details", () => ({ PublicVisaDetails: () => null }))
// Fail immediately if either public route regresses to the legacy API service.
vi.mock("@/modules/visa-assistance/server", () => {
  throw new Error("Legacy visa API must stay unplugged")
})

import SearchPage from "@/app/visa-assistance/[nationality]/[destination]/page"
import DetailPage, {
  generateMetadata,
} from "@/app/visa-assistance/[nationality]/[destination]/[listingId]/page"
import { getPublicVisaDetail, getPublicVisaResults } from "./public-catalog"

beforeEach(() => vi.resetAllMocks())

describe("public catalog routes", () => {
  const params = Promise.resolve({
    nationality: "LK",
    destination: "IN",
    listingId: "id",
  })
  it("serves listing detail and metadata from the published catalog", async () => {
    const listing = { ...toPublicVisaListing(listingFixture()), documents: [] }
    vi.mocked(getPublicVisaDetail).mockResolvedValue(listing)
    expect((await DetailPage({ params })).props.listing).toEqual(listing)
    expect((await generateMetadata({ params })).title).toBe(
      "India tourist visa | Vacatina"
    )
  })
  it("returns 404 with generic non-indexable metadata for hidden or missing listings", async () => {
    vi.mocked(getPublicVisaDetail).mockResolvedValue(null)
    await expect(DetailPage({ params })).rejects.toThrow("NEXT_NOT_FOUND")
    expect((await generateMetadata({ params })).robots).toEqual({
      index: false,
    })
  })
  it("rejects invalid search routes instead of falling back to the provider", async () => {
    vi.mocked(getPublicVisaResults).mockResolvedValue(null)
    await expect(SearchPage({ params })).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
