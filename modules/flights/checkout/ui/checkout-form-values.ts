import type { CheckoutAncillaryPayloadMetadata } from "@/modules/flights/checkout/domain"

export interface CheckoutFormValues {
  paymentMode: "pay_now" | "hold"
  contact: {
    email: string
    phoneNumber: string
  }
  billing: {
    address: string
    city: string
    country: string
  }
  passengers: Array<{
    id: string
    type: "adult" | "child" | "infant_without_seat"
    title: "mr" | "mrs" | "ms" | "miss" | "dr"
    givenName: string
    familyName: string
    bornOn: string
    gender: "m" | "f"
    identityType: "passport" | "tax_id"
    identityNumber: string
    identityCountryCode: string
    identityExpiresOn: string
  }>
  metadata: Array<{
    key: string
    value: string
  }>
  ancillarySelection: {
    services: Array<{ id: string; quantity: number }>
    metadata: CheckoutAncillaryPayloadMetadata | null
  }
}

