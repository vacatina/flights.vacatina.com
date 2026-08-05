import "server-only"

import { clerkClient } from "@clerk/nextjs/server"

import { isActiveAdminMetadata } from "@/modules/flights/cancellations/server/admin-guard"

export interface AdminAlertRecipient {
  id: string
  email: string
}

export async function listActiveAdminAlertRecipients(): Promise<
  AdminAlertRecipient[]
> {
  const client = await clerkClient()
  const response = await client.users.getUserList({ limit: 100 })
  const users = Array.isArray(response.data) ? response.data : []

  return users
    .filter((user) => isActiveAdminMetadata(user.publicMetadata))
    .filter((user) => !Boolean(user.banned) && !Boolean(user.locked))
    .map((user) => {
      const email =
        user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)
          ?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null

      return email ? { id: user.id, email } : null
    })
    .filter((recipient): recipient is AdminAlertRecipient => Boolean(recipient))
}
