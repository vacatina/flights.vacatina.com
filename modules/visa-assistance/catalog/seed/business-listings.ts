import type { VisaListingInput } from "../domain/listing"
import { sharedDetails, passport, photo, itinerary } from "./shared"

const businessDetails = {
  ...sharedDetails,
  code: "BUSINESS",
  eligibilityNotes:
    "For Sri Lankan passport holders requesting help with a business visit. Our team must confirm the permitted activities and suitable visa category; this sample does not authorize employment.",
}

const invitation = {
  label: "Business invitation letter",
  instructions:
    "Upload an invitation describing the host organization, visit purpose, and planned dates. This is a sample checklist item; our team will confirm actual requirements.",
  required: true,
  scope: "per_application" as const,
}

export const BUSINESS_SEED_LISTINGS = [
  {
    ...businessDetails,
    destinationCode: "IN",
    title: "India business visa assistance",
    shortSummary:
      "Development sample: visa assistance for a business visit to India.",
    fullDescription:
      "Share your India business travel plans with Vacatina. Add each traveler, your host organization, and the sample supporting documents. Our team will review the visit purpose, confirm the appropriate visa category and actual checklist, and provide a final quote. This request is not a submission to an authority and does not guarantee approval.",
    price: "110.00",
    documents: [passport, photo, invitation, itinerary],
  },
  {
    ...businessDetails,
    destinationCode: "SG",
    title: "Singapore business visa assistance",
    shortSummary:
      "Development sample: prepare a Singapore business visit request.",
    fullDescription:
      "Request Vacatina assistance for your planned business visit to Singapore. Supply traveler information and details of the inviting organization with the sample uploads. Our team will confirm eligibility, the appropriate entry permission, permitted activities, processing timeline, and final price. No payment is collected with this request.",
    price: "135.00",
    documents: [passport, photo, invitation, itinerary],
  },
  {
    ...businessDetails,
    destinationCode: "AE",
    title: "UAE business visa assistance",
    shortSummary:
      "Development sample: get help preparing a UAE business visit request.",
    fullDescription:
      "Send your UAE business visit details to Vacatina for review. Include each traveler, the visit purpose, host organization, and sample supporting uploads. Our team will determine the suitable entry category and confirm permitted activities, required documents, and a final quote. This sample does not establish a legal visa category or authorize work.",
    price: "195.00",
    documents: [passport, photo, invitation, itinerary],
  },
] satisfies VisaListingInput[]
