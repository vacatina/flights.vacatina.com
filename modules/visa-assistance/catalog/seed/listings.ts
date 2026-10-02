import type { VisaListingInput } from "../domain/listing"
import { sharedDetails, passport, photo, itinerary } from "./shared"
import { BUSINESS_SEED_LISTINGS } from "./business-listings"

export { SEED_NOTICE } from "./shared"

export const VISA_SEED_LISTINGS = [
  {
    ...sharedDetails,
    destinationCode: "IN",
    title: "India tourist visa assistance",
    shortSummary: "Development sample: visa assistance for a holiday in India.",
    fullDescription:
      "Prepare your India tourism request with Vacatina. Share your trip dates, traveler information, and the sample documents below. Our team will review your details, confirm the applicable visa route, and provide a final quote. Submitting this request is not a visa application to an authority and does not guarantee approval.",
    price: "75.00",
    documents: [passport, photo, itinerary],
  },
  {
    ...sharedDetails,
    destinationCode: "SG",
    title: "Singapore tourist visa assistance",
    shortSummary:
      "Development sample: prepare a Singapore holiday request with our team.",
    fullDescription:
      "Send your Singapore tourism details to Vacatina for a team review. Add each traveler and upload the sample supporting documents below. Our team will confirm eligibility, the actual checklist, processing timeline, and final quote before any further processing. No payment is collected with this request.",
    price: "95.00",
    documents: [
      passport,
      photo,
      itinerary,
      {
        label: "Accommodation details",
        instructions:
          "If available, upload the accommodation reservation or intended address for your group.",
        required: false,
        scope: "per_application",
      },
    ],
  },
  {
    ...sharedDetails,
    destinationCode: "AE",
    title: "UAE tourist visa assistance",
    shortSummary:
      "Development sample: get help preparing your UAE tourism request.",
    fullDescription:
      "Plan your UAE holiday with a Vacatina-assisted request. Share your intended entry date, traveler details, and the sample uploads below. Our team will confirm the suitable visa option, permitted stay, required documents, and final price after review. Do not make travel arrangements on the assumption that this request guarantees a visa.",
    price: "145.00",
    documents: [passport, photo, itinerary],
  },
  ...BUSINESS_SEED_LISTINGS,
] satisfies VisaListingInput[]
