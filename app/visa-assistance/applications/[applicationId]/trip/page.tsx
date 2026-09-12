import { VisaApplicationShell } from "@/modules/visa-assistance/applications"
import { loadOwnedVisaApplicationPage } from "@/modules/visa-assistance/applications/server"
import { TripStepForm } from "@/modules/visa-assistance/applications/ui/trip-step-form"

export default async function VisaApplicationTripPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const path = `/visa-assistance/applications/${applicationId}/trip`
  const { detail } = await loadOwnedVisaApplicationPage(applicationId, path)

  return (
    <VisaApplicationShell detail={detail} currentStep="trip">
      <TripStepForm
        applicationId={applicationId}
        entryDate={detail.application.entryDate}
        travelerCount={detail.application.travelerCount}
      />
    </VisaApplicationShell>
  )
}
