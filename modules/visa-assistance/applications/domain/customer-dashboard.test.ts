import { describe, expect, test } from "vitest"
import {
  applicationFixture,
  documentFixture,
  requirementId,
} from "../testing/application-fixture"

import type { VisaApplicationDetail } from "@/modules/visa-assistance/applications/domain/application-types"
import {
  getCustomerVisaStatus,
  getVisaApplicationResumeStep,
} from "@/modules/visa-assistance/applications/domain/customer-dashboard"

describe("customer visa dashboard", () => {
  test("uses customer-friendly status labels", () => {
    expect(getCustomerVisaStatus("draft").label).toBe("In progress")
    expect(getCustomerVisaStatus("needs_information").label).toBe(
      "Action needed"
    )
    expect(getCustomerVisaStatus("closed").progress).toBe(100)
  })

  test("resumes a draft at its first incomplete step", () => {
    expect(getVisaApplicationResumeStep(createDetail())).toBe("trip")
    expect(
      getVisaApplicationResumeStep(createDetail({ entryDate: "2027-01-10" }))
    ).toBe("travelers")
    expect(
      getVisaApplicationResumeStep(
        createDetail({ entryDate: "2027-01-10", includeTraveler: true })
      )
    ).toBe("contact")
    expect(
      getVisaApplicationResumeStep(
        createDetail({
          entryDate: "2027-01-10",
          includeTraveler: true,
          includeContact: true,
        })
      )
    ).toBe("documents")
    expect(
      getVisaApplicationResumeStep(
        createDetail({
          entryDate: "2027-01-10",
          includeTraveler: true,
          includeContact: true,
          includePassport: true,
        })
      )
    ).toBe("review")
  })
})

function createDetail(
  input: {
    entryDate?: string
    includeTraveler?: boolean
    includeContact?: boolean
    includePassport?: boolean
  } = {}
): VisaApplicationDetail {
  const traveler = {
    id: "traveler-1",
  } as VisaApplicationDetail["travelers"][number]

  return {
    application: {
      ...applicationFixture().application,
      listingSnapshot: {
        ...applicationFixture().application.listingSnapshot,
        documents: [
          applicationFixture().application.listingSnapshot.documents[0],
        ],
      },
      entryDate: input.entryDate ?? null,
      travelerCount: 1,
      contactEmail: input.includeContact ? "traveler@example.com" : null,
      contactPhone: input.includeContact ? "+94771234567" : null,
    } as VisaApplicationDetail["application"],
    travelers: input.includeTraveler ? [traveler] : [],
    documents: input.includePassport
      ? [
          {
            ...documentFixture(),
            travelerId: traveler.id,
            status: "uploaded",
            requirementId,
          } as VisaApplicationDetail["documents"][number],
        ]
      : [],
  }
}
