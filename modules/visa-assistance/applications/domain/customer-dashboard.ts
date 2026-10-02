import type { VisaApplicationDetail } from "@/modules/visa-assistance/applications/domain/application-types"
import { getMissingRequiredDocuments } from "./document-checklist"
import type { VisaApplicationStatus } from "@/modules/visa-assistance/applications/domain/status"

export type CustomerVisaStatusTone =
  "default" | "secondary" | "outline" | "destructive"

interface CustomerVisaStatusPresentation {
  label: string
  description: string
  progress: number
  tone: CustomerVisaStatusTone
}

const customerStatus: Record<
  VisaApplicationStatus,
  CustomerVisaStatusPresentation
> = {
  draft: {
    label: "In progress",
    description: "Finish the remaining steps when you are ready.",
    progress: 15,
    tone: "outline",
  },
  submitted: {
    label: "Request received",
    description: "Your request is in the queue for review.",
    progress: 35,
    tone: "secondary",
  },
  under_review: {
    label: "Under review",
    description: "Our visa team is checking your information.",
    progress: 60,
    tone: "secondary",
  },
  needs_information: {
    label: "Action needed",
    description: "Check your email for the information our team requested.",
    progress: 60,
    tone: "destructive",
  },
  customer_contacted: {
    label: "Update sent",
    description: "We sent an update to your application email.",
    progress: 80,
    tone: "default",
  },
  closed: {
    label: "Closed",
    description: "This visa request is no longer active.",
    progress: 100,
    tone: "outline",
  },
}

export function getCustomerVisaStatus(status: VisaApplicationStatus) {
  return customerStatus[status]
}

export function getVisaApplicationResumeStep(detail: VisaApplicationDetail) {
  const { application, travelers } = detail

  if (!application.entryDate) return "trip"
  if (travelers.length !== application.travelerCount) return "travelers"
  if (!application.contactEmail || !application.contactPhone) return "contact"

  if (getMissingRequiredDocuments(detail).length > 0) {
    return "documents"
  }

  return "review"
}
