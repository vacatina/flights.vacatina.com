import { redirect } from "next/navigation"

import { getVisaApplicationResumeStep } from "@/modules/visa-assistance/applications/domain"
import { loadOwnedVisaApplicationPage } from "@/modules/visa-assistance/applications/server"

export default async function VisaApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const path = `/visa-assistance/applications/${applicationId}`
  const { detail } = await loadOwnedVisaApplicationPage(applicationId, path)

  if (detail.application.status !== "draft") {
    redirect(`/visa-requests/${applicationId}`)
  }

  redirect(`${path}/${getVisaApplicationResumeStep(detail)}`)
}
