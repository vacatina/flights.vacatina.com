import { redirect } from "next/navigation"

import { VisaApplicationShell } from "@/modules/visa-assistance/applications"
import { loadOwnedVisaApplicationPage } from "@/modules/visa-assistance/applications/server"
import { TravelersStepForm } from "@/modules/visa-assistance/applications/ui/travelers-step-form"

export default async function VisaApplicationTravelersPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const basePath = `/visa-assistance/applications/${applicationId}`
  const path = `${basePath}/travelers`
  const { detail } = await loadOwnedVisaApplicationPage(applicationId, path)

  if (!detail.application.entryDate) {
    redirect(`${basePath}/trip`)
  }

  return (
    <VisaApplicationShell detail={detail} currentStep="travelers">
      <TravelersStepForm
        applicationId={applicationId}
        travelerCount={detail.application.travelerCount}
        nationalityCode={detail.application.nationalityCode}
        travelers={detail.travelers}
      />
    </VisaApplicationShell>
  )
}
