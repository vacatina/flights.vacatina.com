"use server"

import { revalidatePath } from "next/cache"

import type { ReviewStepValues } from "@/modules/visa-assistance/applications/domain"
import { requireVisaApplicationActor } from "@/modules/visa-assistance/applications/server/authorization"
import { submitVisaApplication } from "@/modules/visa-assistance/applications/server/application-service"
import { toVisaApplicationActionError } from "@/modules/visa-assistance/applications/server/actions/action-result"

export async function submitVisaApplicationAction(input: ReviewStepValues) {
  try {
    const actor = await requireVisaApplicationActor()
    await submitVisaApplication({ actorUserId: actor.appUserId, ...input })
    revalidatePath(`/visa-assistance/applications/${input.applicationId}`)
    revalidatePath("/admin/visa-applications")
    return { ok: true } as const
  } catch (error) {
    return toVisaApplicationActionError(error)
  }
}
