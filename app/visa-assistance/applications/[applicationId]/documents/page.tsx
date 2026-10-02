import { redirect } from "next/navigation"

import { VisaApplicationShell } from "@/modules/visa-assistance/applications"
import { loadEditableVisaApplicationPage } from "@/modules/visa-assistance/applications/server"
import { DocumentsStep } from "@/modules/visa-assistance/applications/ui/documents-step"
import { getVisaApplicationResumeStep } from "@/modules/visa-assistance/applications/domain"

export default async function VisaApplicationDocumentsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const basePath = `/visa-assistance/applications/${applicationId}`
  const path = `${basePath}/documents`
  const { detail } = await loadEditableVisaApplicationPage(applicationId, path)

  const step = getVisaApplicationResumeStep(detail)
  if (step !== "documents" && step !== "review") redirect(`${basePath}/${step}`)

  return (
    <VisaApplicationShell detail={detail} currentStep="documents">
      <DocumentsStep detail={detail} />
    </VisaApplicationShell>
  )
}
