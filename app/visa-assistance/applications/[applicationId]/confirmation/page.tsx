import { redirect } from "next/navigation"
import { loadOwnedVisaApplicationPage } from "@/modules/visa-assistance/applications/server"
import { VisaRequestConfirmation } from "@/modules/visa-assistance/applications/ui/request-confirmation"

export default async function VisaApplicationConfirmationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const basePath = `/visa-assistance/applications/${applicationId}`
  const path = `${basePath}/confirmation`
  const { detail } = await loadOwnedVisaApplicationPage(applicationId, path)
  if (detail.application.status === "draft") redirect(`${basePath}/review`)
  return <VisaRequestConfirmation detail={detail} />
}
