import { redirect } from "next/navigation"

import { VisaApplicationShell } from "@/modules/visa-assistance/applications"
import { loadOwnedVisaApplicationPage } from "@/modules/visa-assistance/applications/server"
import { DocumentsStep } from "@/modules/visa-assistance/applications/ui/documents-step"

export default async function VisaApplicationDocumentsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const basePath = `/visa-assistance/applications/${applicationId}`
  const path = `${basePath}/documents`
  const { detail } = await loadOwnedVisaApplicationPage(applicationId, path)

  if (!detail.application.contactEmail || !detail.application.contactPhone) {
    redirect(`${basePath}/contact`)
  }

  return (
    <VisaApplicationShell detail={detail} currentStep="documents">
      <DocumentsStep
        applicationId={applicationId}
        travelers={detail.travelers}
        documents={detail.documents}
      />
    </VisaApplicationShell>
  )
}
