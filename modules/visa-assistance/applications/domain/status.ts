export const VISA_APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "needs_information",
  "customer_contacted",
  "closed",
] as const

export type VisaApplicationStatus = (typeof VISA_APPLICATION_STATUSES)[number]

const editableStatuses = new Set<VisaApplicationStatus>(["draft"])

export function isVisaApplicationEditable(status: VisaApplicationStatus) {
  return editableStatuses.has(status)
}

export function getVisaApplicationStatusLabel(status: VisaApplicationStatus) {
  return status
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ")
}
