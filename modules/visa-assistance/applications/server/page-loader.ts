import "server-only"

import { notFound, redirect } from "next/navigation"

import { isVisaApplicationEditable } from "@/modules/visa-assistance/applications/domain"
import { getOwnedVisaApplication } from "@/modules/visa-assistance/applications/server/application-service"
import { getVisaApplicationActor } from "@/modules/visa-assistance/applications/server/authorization"

export async function loadOwnedVisaApplicationPage(
  applicationId: string,
  returnPath: string
) {
  const actor = await getVisaApplicationActor()

  if (!actor) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`)
  }

  try {
    const detail = await getOwnedVisaApplication(applicationId, actor.appUserId)

    return {
      actor,
      detail,
      editable: isVisaApplicationEditable(detail.application.status),
    }
  } catch {
    notFound()
  }
}
