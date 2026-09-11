"use server"

import { redirect } from "next/navigation"

import { getVisaApplicationActor } from "@/modules/visa-assistance/applications/server/authorization"
import { createVisaApplicationDraft } from "@/modules/visa-assistance/applications/server/application-service"

export async function createVisaApplicationDraftAction(formData: FormData) {
  const nationalityCode = requiredValue(formData, "nationalityCode")
  const destinationCode = requiredValue(formData, "destinationCode")
  const visaTypeId = requiredValue(formData, "visaTypeId")
  const providerProductId = optionalValue(formData, "providerProductId")
  const actor = await getVisaApplicationActor()

  if (!actor) {
    const returnPath = `/visa-assistance/${nationalityCode}/${destinationCode}`
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`)
  }

  const application = await createVisaApplicationDraft({
    actorUserId: actor.appUserId,
    contactEmail: actor.email,
    nationalityCode,
    destinationCode,
    visaTypeId,
    providerProductId,
  })

  redirect(`/visa-assistance/applications/${application.id}/trip`)
}

function requiredValue(formData: FormData, name: string) {
  const value = formData.get(name)

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${name}.`)
  }

  return value.trim()
}

function optionalValue(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" && value.trim() ? value.trim() : null
}
