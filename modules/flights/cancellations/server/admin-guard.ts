import "server-only"

import { currentUser } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import {
  findUserByClerkUserId,
  upsertUserMirror,
  type UserMirrorRecord,
} from "@/modules/auth/server/repository"

export interface AdminActor {
  clerkUserId: string
  appUserId: string
  email: string | null
}

export interface AdminMetadata {
  role?: unknown
  status?: unknown
}

export function isActiveAdminMetadata(metadata: AdminMetadata | null | undefined) {
  return metadata?.role === "admin" && metadata?.status === "active"
}

export async function requireActiveAdmin(): Promise<AdminActor> {
  const user = await currentUser()

  if (!user || !isActiveAdminMetadata(user.publicMetadata)) {
    notFound()
  }

  const primaryEmail =
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  const existing = await findUserByClerkUserId(user.id)
  const mirror: UserMirrorRecord =
    existing ??
    (await upsertUserMirror({
      clerkUserId: user.id,
      primaryEmail,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    }))

  return {
    clerkUserId: user.id,
    appUserId: mirror.id,
    email: primaryEmail,
  }
}
