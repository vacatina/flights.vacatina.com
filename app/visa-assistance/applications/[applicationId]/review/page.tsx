import { redirect } from "next/navigation"
import { VisaApplicationShell } from "@/modules/visa-assistance/applications"
import { getVisaApplicationResumeStep } from "@/modules/visa-assistance/applications/domain"
import { loadEditableVisaApplicationPage } from "@/modules/visa-assistance/applications/server"
import { ReviewStepForm } from "@/modules/visa-assistance/applications/ui/review-step-form"

export default async function VisaApplicationReviewPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const basePath = `/visa-assistance/applications/${applicationId}`
  const { detail } = await loadEditableVisaApplicationPage(
    applicationId,
    `${basePath}/review`
  )
  const step = getVisaApplicationResumeStep(detail)
  if (step !== "review") redirect(`${basePath}/${step}`)
  return (
    <VisaApplicationShell detail={detail} currentStep="review">
      <ReviewStepForm
        key={detail.application.pricingSnapshot.pricedAt}
        detail={detail}
      />
    </VisaApplicationShell>
  )
}
