import "server-only"

import { currentUser } from "@clerk/nextjs/server"

import {
  findUserByClerkUserId,
  upsertUserMirror,
} from "@/modules/auth/server/repository"

export interface VisaApplicationActor {
  appUserId: string
  clerkUserId: string
  email: string | null
}

export async function getVisaApplicationActor(): Promise<VisaApplicationActor | null> {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null
  const existing = await findUserByClerkUserId(clerkUser.id)
  const user =
    existing ??
    (await upsertUserMirror({
      clerkUserId: clerkUser.id,
      primaryEmail,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    }))

  return {
    appUserId: user.id,
    clerkUserId: clerkUser.id,
    email: primaryEmail,
  }
}

export async function requireVisaApplicationActor() {
  const actor = await getVisaApplicationActor()

  if (!actor) {
    throw new Error("Sign in to continue your visa request.")
  }

  return actor
}
