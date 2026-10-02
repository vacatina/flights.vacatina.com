import { redirect } from "next/navigation"

import { VisaApplicationShell } from "@/modules/visa-assistance/applications"
import { loadEditableVisaApplicationPage } from "@/modules/visa-assistance/applications/server"
import { ContactStepForm } from "@/modules/visa-assistance/applications/ui/contact-step-form"

export default async function VisaApplicationContactPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const basePath = `/visa-assistance/applications/${applicationId}`
  const path = `${basePath}/contact`
  const { detail } = await loadEditableVisaApplicationPage(applicationId, path)

  if (detail.travelers.length !== detail.application.travelerCount) {
    redirect(`${basePath}/travelers`)
  }

  return (
    <VisaApplicationShell detail={detail} currentStep="contact">
      <ContactStepForm
        applicationId={applicationId}
        email={detail.application.contactEmail}
        phone={detail.application.contactPhone}
      />
    </VisaApplicationShell>
  )
}
