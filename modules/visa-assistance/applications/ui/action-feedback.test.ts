import { describe, expect, it, vi } from "vitest"
vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error === "NEXT_REDIRECT") throw error
  }),
}))
import { withVisaActionFeedback } from "./action-feedback"

describe("visa action feedback", () => {
  it("preserves server validation feedback", async () => {
    const result = { ok: false as const, message: "Add a required file." }
    expect(await withVisaActionFeedback(async () => result)).toBe(result)
  })
  it("offers a retry without exposing transport error details", async () => {
    const result = await withVisaActionFeedback(async () => {
      throw new Error("Sensitive server error")
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain("Please try again")
    expect(result.message).not.toContain("Sensitive")
  })
  it("does not swallow Next.js navigation signals", async () => {
    await expect(
      withVisaActionFeedback(async () => {
        throw "NEXT_REDIRECT"
      })
    ).rejects.toBe("NEXT_REDIRECT")
  })
})
