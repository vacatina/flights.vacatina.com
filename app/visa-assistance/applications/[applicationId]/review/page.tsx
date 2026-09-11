import { redirect } from "next/navigation"

import { VisaApplicationShell } from "@/modules/visa-assistance/applications"
import {
  loadOwnedVisaApplicationPage,
  refreshVisaApplicationPricing,
} from "@/modules/visa-assistance/applications/server"
import { ReviewStepForm } from "@/modules/visa-assistance/applications/ui/review-step-form"

export default async function VisaApplicationReviewPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const basePath = `/visa-assistance/applications/${applicationId}`
  const path = `${basePath}/review`
  const loaded = await loadOwnedVisaApplicationPage(applicationId, path)
  const passportTravelerIds = new Set(
    loaded.detail.documents
      .filter(
        (document) =>
          document.status === "uploaded" &&
          document.documentType === "passport_bio_page"
      )
      .map((document) => document.travelerId)
  )

  if (
    loaded.detail.travelers.some(
      (traveler) => !passportTravelerIds.has(traveler.id)
    )
  ) {
    redirect(`${basePath}/documents`)
  }

  await refreshVisaApplicationPricing(applicationId, loaded.actor.appUserId)
  const { detail } = await loadOwnedVisaApplicationPage(applicationId, path)

  return (
    <VisaApplicationShell detail={detail} currentStep="review">
      <ReviewStepForm
        key={detail.application.pricingSnapshot?.pricedAt}
        detail={detail}
      />
    </VisaApplicationShell>
  )
}
