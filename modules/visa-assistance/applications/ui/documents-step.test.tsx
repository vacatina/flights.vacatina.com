import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ComponentProps } from "react"
import {
  applicationFixture,
  documentFixture,
  sharedRequirementId,
} from "../testing/application-fixture"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}))
vi.mock("../server/actions", () => ({
  createVisaDocumentUploadIntentAction: vi.fn(),
  completeVisaDocumentUploadAction: vi.fn(),
  deleteVisaDocumentAction: vi.fn(),
}))
import { DocumentsStep } from "./documents-step"

afterEach(cleanup)
describe("dynamic visa documents screen", () => {
  it("renders two traveler inputs and one shared input, and blocks missing files", () => {
    render(<DocumentsStep detail={applicationFixture()} />)
    expect(screen.getAllByLabelText("Upload Passport")).toHaveLength(2)
    expect(screen.getAllByLabelText("Upload Itinerary")).toHaveLength(1)
    expect(
      screen.getByRole("heading", { name: "Shared documents" })
    ).toBeTruthy()
    expect(screen.getByText("Add 3 required files to continue.")).toBeTruthy()
    expect(
      (
        screen.getByRole("button", {
          name: "Save and continue",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
  })
  it("enables review when all snapshot slots are verified", () => {
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
    render(<DocumentsStep detail={detail} />)
    expect(
      screen
        .getByRole("link", { name: "Save and continue" })
        .getAttribute("href")
    ).toContain("/review")
    expect(
      screen.getAllByRole("button", { name: "Replace file" })
    ).toHaveLength(3)
  })
  it("shows a reviewed empty checklist without inventing uploads", () => {
    const detail = applicationFixture()
    detail.application.listingSnapshot.documents = []
    render(<DocumentsStep detail={detail} />)
    expect(
      screen.getByText(/No documents are required at this stage/)
    ).toBeTruthy()
    expect(screen.queryByLabelText("Upload Passport")).toBeNull()
  })
})
