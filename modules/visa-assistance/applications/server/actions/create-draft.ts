"use server"

import { redirect } from "next/navigation"
import { getVisaApplicationActor } from "../authorization"
import { createVisaApplicationDraft } from "../application-service"
import { createVisaApplicationSchema } from "../../domain"
import { getPublishedVisaListing } from "@/modules/visa-assistance/catalog/server/repository"
import {
  publicListingPath,
  toPublicVisaListing,
} from "@/modules/visa-assistance/catalog/domain/public-listing"
import { toVisaApplicationActionError } from "./action-result"

export async function createVisaApplicationDraftAction(formData: FormData) {
  const parsed = createVisaApplicationSchema.safeParse({
    listingId: formData.get("listingId"),
  })
  if (!parsed.success)
    return { ok: false, message: "Choose an available visa listing." } as const
  const actor = await getVisaApplicationActor()
  if (!actor) {
    const listing = await getPublishedVisaListing(parsed.data.listingId)
    const returnPath = listing
      ? publicListingPath(toPublicVisaListing(listing))
      : "/visa-assistance"
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`)
  }
  let application
  try {
    application = await createVisaApplicationDraft({
      actorUserId: actor.appUserId,
      contactEmail: actor.email,
      listingId: parsed.data.listingId,
    })
  } catch (error) {
    return toVisaApplicationActionError(error)
  }
  redirect(`/visa-assistance/applications/${application.id}/trip`)
}
