"use server"

import { revalidatePath } from "next/cache"

import type {
  ContactStepValues,
  TravelersStepValues,
  TripStepValues,
} from "@/modules/visa-assistance/applications/domain"
import {
  saveVisaApplicationContact,
  saveVisaApplicationTravelerDetails,
  saveVisaApplicationTrip,
} from "@/modules/visa-assistance/applications/server/application-service"
import { requireVisaApplicationActor } from "@/modules/visa-assistance/applications/server/authorization"
import { toVisaApplicationActionError } from "@/modules/visa-assistance/applications/server/actions/action-result"

export async function saveVisaTripStepAction(input: TripStepValues) {
  try {
    const actor = await requireVisaApplicationActor()
    await saveVisaApplicationTrip({ ...input, actorUserId: actor.appUserId })
    revalidateApplication(input.applicationId)
    return { ok: true } as const
  } catch (error) {
    return toVisaApplicationActionError(error)
  }
}

export async function saveVisaTravelersStepAction(input: TravelersStepValues) {
  try {
    const actor = await requireVisaApplicationActor()
    await saveVisaApplicationTravelerDetails({
      ...input,
      actorUserId: actor.appUserId,
    })
    revalidateApplication(input.applicationId)
    return { ok: true } as const
  } catch (error) {
    return toVisaApplicationActionError(error)
  }
}

export async function saveVisaContactStepAction(input: ContactStepValues) {
  try {
    const actor = await requireVisaApplicationActor()
    await saveVisaApplicationContact({ ...input, actorUserId: actor.appUserId })
    revalidateApplication(input.applicationId)
    return { ok: true } as const
  } catch (error) {
    return toVisaApplicationActionError(error)
  }
}

function revalidateApplication(applicationId: string) {
  revalidatePath(`/visa-assistance/applications/${applicationId}`)
}
