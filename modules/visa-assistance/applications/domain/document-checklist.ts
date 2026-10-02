import { VisaApplicationError } from "@/modules/visa-assistance/applications/domain/application-error"
import type { VisaApplicationDetail } from "./application-types"
import type { VisaDocumentRequirement } from "./listing-snapshot"

export interface VisaDocumentSlot {
  key: string
  requirement: VisaDocumentRequirement
  travelerId: string | null
  travelerLabel: string
}

export function getDocumentSlots(
  detail: VisaApplicationDetail
): VisaDocumentSlot[] {
  return detail.application.listingSnapshot.documents.flatMap((requirement) => {
    const travelers =
      requirement.scope === "per_application"
        ? [{ id: null, label: "Shared documents" }]
        : detail.travelers.map((traveler) => ({
            id: traveler.id,
            label: `${traveler.firstName} ${traveler.lastName}`,
          }))
    return travelers.map((traveler) => ({
      key: `${requirement.id}:${traveler.id ?? "shared"}`,
      requirement,
      travelerId: traveler.id,
      travelerLabel: traveler.label,
    }))
  })
}

export function getMissingRequiredDocuments(detail: VisaApplicationDetail) {
  return getDocumentSlots(detail).filter(
    (slot) =>
      slot.requirement.required &&
      !detail.documents.some(
        (document) =>
          document.applicationId === detail.application.id &&
          document.requirementId === slot.requirement.id &&
          document.travelerId === slot.travelerId &&
          document.status === "uploaded"
      )
  )
}

export function assertDocumentSlot(
  detail: VisaApplicationDetail,
  requirementId: string,
  travelerId: string | null
) {
  const slot = getDocumentSlots(detail).find(
    (candidate) =>
      candidate.requirement.id === requirementId &&
      candidate.travelerId === travelerId
  )
  if (!slot)
    throw new VisaApplicationError(
      "This document or traveler does not belong to the saved request checklist."
    )
  return slot
}

export function getDocumentLabel(
  detail: VisaApplicationDetail,
  requirementId: string
) {
  return (
    detail.application.listingSnapshot.documents.find(
      (item) => item.id === requirementId
    )?.label ?? "Document"
  )
}
