import { fireEvent, render, screen } from "@testing-library/react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { afterEach, describe, expect, it } from "vitest"
import { cleanup } from "@testing-library/react"

import { EMPTY_LISTING_VALUES } from "@/modules/visa-assistance/catalog/domain/form-values"
import type { VisaListingInput } from "@/modules/visa-assistance/catalog/domain/listing"
import { ListingDocumentsSection } from "./documents-section"

const firstId = "5dd185fc-d8cd-4456-9a53-f81fb5d7c9e5"
const secondId = "d4b4f6de-afc1-41b3-9272-a3f2a70948cc"

function Harness() {
  const form = useForm<VisaListingInput>({
    defaultValues: {
      ...EMPTY_LISTING_VALUES,
      documentsReviewed: true,
      documents: [
        {
          id: firstId,
          label: "Passport",
          scope: "per_traveler",
          required: true,
        },
        {
          id: secondId,
          label: "Itinerary",
          scope: "per_application",
          required: false,
        },
      ],
    },
  })
  const values = useWatch({ control: form.control })
  return (
    <FormProvider {...form}>
      <ListingDocumentsSection />
      <output data-testid="values">{JSON.stringify(values)}</output>
    </FormProvider>
  )
}

function values(): VisaListingInput {
  return JSON.parse(screen.getByTestId("values").textContent ?? "{}")
}

afterEach(cleanup)

describe("document checklist editor", () => {
  it("preserves requirement IDs when reordering and requires a fresh review", () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Move document 2 up" }))
    expect(values().documents.map((document) => document.id)).toEqual([
      secondId,
      firstId,
    ])
    expect(values().documents.map((document) => document.label)).toEqual([
      "Itinerary",
      "Passport",
    ])
    expect(values().documentsReviewed).toBe(false)
  })

  it("clears review when instructions change or a requirement is removed", () => {
    render(<Harness />)
    fireEvent.change(
      screen.getAllByLabelText("Upload instructions (optional)")[0],
      { target: { value: "All text must be visible" } }
    )
    expect(values().documentsReviewed).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Remove document 1" }))
    expect(values().documents).toHaveLength(1)
    expect(values().documents[0].id).toBe(secondId)
  })
})
