// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { applicationFixture } from "../testing/application-fixture"
vi.mock("server-only", () => ({}))
vi.mock("./authorization", () => ({ getVisaApplicationActor: vi.fn() }))
vi.mock("./application-service", () => ({ getOwnedVisaApplication: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("REDIRECT:" + path)
  },
  notFound: () => {
    throw new Error("NOT_FOUND")
  },
}))
import { getVisaApplicationActor } from "./authorization"
import { getOwnedVisaApplication } from "./application-service"
import { loadEditableVisaApplicationPage } from "./page-loader"
import { VisaApplicationError } from "../domain/application-error"

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getVisaApplicationActor).mockResolvedValue({
    appUserId: "owner",
    clerkUserId: "clerk",
    email: "test@example.com",
  })
  vi.mocked(getOwnedVisaApplication).mockResolvedValue(applicationFixture())
})
describe("editable visa pages", () => {
  it("loads an owned draft", async () => {
    expect(
      (await loadEditableVisaApplicationPage("va_test", "/trip")).editable
    ).toBe(true)
  })
  it.each(["submitted", "under_review", "closed"] as const)(
    "redirects %s requests to confirmation",
    async (status) => {
      const detail = applicationFixture()
      detail.application.status = status
      vi.mocked(getOwnedVisaApplication).mockResolvedValue(detail)
      await expect(
        loadEditableVisaApplicationPage("va_test", "/trip")
      ).rejects.toThrow(
        "REDIRECT:/visa-assistance/applications/va_test/confirmation"
      )
    }
  )
  it("never reopens a submitted request even if its status is draft", async () => {
    const detail = applicationFixture()
    detail.application.submittedAt = new Date()
    vi.mocked(getOwnedVisaApplication).mockResolvedValue(detail)
    await expect(
      loadEditableVisaApplicationPage("va_test", "/trip")
    ).rejects.toThrow("/confirmation")
  })
  it("returns 404 for unauthorized records but propagates database failures", async () => {
    vi.mocked(getOwnedVisaApplication).mockRejectedValueOnce(
      new VisaApplicationError("not found")
    )
    await expect(
      loadEditableVisaApplicationPage("va_test", "/trip")
    ).rejects.toThrow("NOT_FOUND")
    vi.mocked(getOwnedVisaApplication).mockRejectedValueOnce(
      new Error("DB unavailable")
    )
    await expect(
      loadEditableVisaApplicationPage("va_test", "/trip")
    ).rejects.toThrow("DB unavailable")
  })
})
