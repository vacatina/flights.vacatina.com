import "server-only"

import { notFound, redirect } from "next/navigation"

import { isVisaApplicationEditable } from "@/modules/visa-assistance/applications/domain"
import { getOwnedVisaApplication } from "@/modules/visa-assistance/applications/server/application-service"
import { getVisaApplicationActor } from "@/modules/visa-assistance/applications/server/authorization"
import { VisaApplicationError } from "../domain/application-error"

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
      editable:
        isVisaApplicationEditable(detail.application.status) &&
        !detail.application.submittedAt,
    }
  } catch (error) {
    if (error instanceof VisaApplicationError) notFound()
    throw error
  }
}

export async function loadEditableVisaApplicationPage(
  applicationId: string,
  returnPath: string
) {
  const loaded = await loadOwnedVisaApplicationPage(applicationId, returnPath)
  if (!loaded.editable) {
    redirect(`/visa-assistance/applications/${applicationId}/confirmation`)
  }
  return loaded
}
