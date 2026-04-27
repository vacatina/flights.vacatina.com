import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { useForm, useWatch } from "react-hook-form"

import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"
import { useCheckoutDraftPersistence } from "@/modules/flights/checkout/ui/hooks/use-checkout-draft-persistence"

describe("useCheckoutDraftPersistence", () => {
  afterEach(() => {
    cleanup()
    window.sessionStorage.clear()
  })

  test("stores only whitelisted non-PII draft fields", async () => {
    const draftKey = "checkout-draft:test-safe-storage"
    window.sessionStorage.clear()

    render(<DraftHarness draftKey={draftKey} />)

    fireEvent.click(screen.getByRole("button", { name: "Populate" }))

    await waitFor(() => {
      const storedRaw = window.sessionStorage.getItem(draftKey)
      expect(storedRaw).not.toBeNull()

      const stored = JSON.parse(storedRaw ?? "{}")
      expect(stored).toEqual({
        paymentMode: "hold",
        ancillarySelection: {
          services: [{ id: "svc_bag_1", quantity: 2 }],
        },
      })
      expect(stored.contact).toBeUndefined()
      expect(stored.billing).toBeUndefined()
      expect(stored.passengers).toBeUndefined()
      expect(stored.metadata).toBeUndefined()
    })
  })

  test("drops invalid legacy draft payload and keeps defaults", async () => {
    const draftKey = "checkout-draft:test-invalid-payload"
    window.sessionStorage.clear()
    window.sessionStorage.setItem(
      draftKey,
      JSON.stringify({
        contact: {
          email: "legacy@example.com",
        },
      })
    )

    render(<DraftHarness draftKey={draftKey} />)

    await waitFor(() => {
      expect(window.sessionStorage.getItem(draftKey)).toBeNull()
    })

    expect(screen.getByTestId("payment-mode").textContent).toBe("pay_now")
    expect(screen.getByTestId("service-count").textContent).toBe("0")
  })
})

function DraftHarness({ draftKey }: { draftKey: string }) {
  const form = useForm<CheckoutFormValues>({
    defaultValues: createDefaultValues(),
  })
  const paymentMode = useWatch({
    control: form.control,
    name: "paymentMode",
  })
  const services = useWatch({
    control: form.control,
    name: "ancillarySelection.services",
  })

  useCheckoutDraftPersistence({
    form,
    draftKey,
    enabled: true,
  })

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          form.reset({
            paymentMode: "hold",
            contact: {
              email: "pii@example.com",
              phoneNumber: "+94710000000",
            },
            billing: {
              address: "123 Sensitive Street",
              city: "Colombo",
              country: "Sri Lanka",
            },
            passengers: [
              {
                id: "pas_1",
                type: "adult",
                title: "mr",
                givenName: "John",
                familyName: "Doe",
                bornOn: "1990-01-01",
                gender: "m",
                identityType: "passport",
                identityNumber: "N1234567",
                identityCountryCode: "LK",
                identityExpiresOn: "2030-01-01",
              },
            ],
            metadata: [{ key: "internal_note", value: "sensitive free text" }],
            ancillarySelection: {
              services: [{ id: "svc_bag_1", quantity: 2 }],
              metadata: null,
            },
          })
        }}
      >
        Populate
      </button>

      <output data-testid="payment-mode">{paymentMode}</output>
      <output data-testid="service-count">{services?.length ?? 0}</output>
    </div>
  )
}

function createDefaultValues(): CheckoutFormValues {
  return {
    paymentMode: "pay_now",
    contact: {
      email: "",
      phoneNumber: "",
    },
    billing: {
      address: "",
      city: "",
      country: "Sri Lanka",
    },
    passengers: [
      {
        id: "pas_1",
        type: "adult",
        title: "mr",
        givenName: "",
        familyName: "",
        bornOn: "",
        gender: "m",
        identityType: "passport",
        identityNumber: "",
        identityCountryCode: "",
        identityExpiresOn: "",
      },
    ],
    metadata: [{ key: "", value: "" }],
    ancillarySelection: {
      services: [],
      metadata: null,
    },
  }
}
