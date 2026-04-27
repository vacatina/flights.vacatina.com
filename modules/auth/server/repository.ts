import { randomUUID } from "node:crypto"

import { and, eq } from "drizzle-orm"

import {
  clerkWebhookEvents,
  getDbClient,
  guestSessions,
  guestUserLinks,
  users,
} from "@/lib/db"
import { logFlightFlow } from "@/lib/logging/flow-debug"

export interface UserMirrorRecord {
  id: string
  clerkUserId: string
  primaryEmail: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}

interface UpsertUserMirrorInput {
  clerkUserId: string
  primaryEmail?: string | null
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string | null
}

interface UpsertGuestSessionInput {
  guestId: string
  expiresAt: Date
  status?: "active" | "linked" | "expired" | "revoked"
  linkedUserId?: string | null
}

const inMemoryUsersByClerkId = new Map<string, UserMirrorRecord>()
const inMemoryGuestSessions = new Map<
  string,
  {
    id: string
    status: "active" | "linked" | "expired" | "revoked"
    linkedUserId: string | null
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
  }
>()
const inMemoryGuestLinks = new Map<
  string,
  {
    id: string
    guestSessionId: string
    userId: string
    linkedAt: Date
  }
>()
const inMemoryWebhookEvents = new Set<string>()

export async function upsertUserMirror(
  input: UpsertUserMirrorInput
): Promise<UserMirrorRecord> {
  const db = getDbClient()
  const now = new Date()

  if (!db) {
    const existing = inMemoryUsersByClerkId.get(input.clerkUserId)

    if (existing) {
      const next: UserMirrorRecord = {
        ...existing,
        primaryEmail:
          input.primaryEmail !== undefined ? input.primaryEmail : existing.primaryEmail,
        firstName: input.firstName !== undefined ? input.firstName : existing.firstName,
        lastName: input.lastName !== undefined ? input.lastName : existing.lastName,
        imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl,
        updatedAt: now,
      }
      inMemoryUsersByClerkId.set(input.clerkUserId, next)
      return next
    }

    const created: UserMirrorRecord = {
      id: createUserId(),
      clerkUserId: input.clerkUserId,
      primaryEmail: input.primaryEmail ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      imageUrl: input.imageUrl ?? null,
      createdAt: now,
      updatedAt: now,
    }
    inMemoryUsersByClerkId.set(input.clerkUserId, created)
    return created
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, input.clerkUserId),
  })

  if (!existing) {
    const [created] = await db
      .insert(users)
      .values({
        id: createUserId(),
        clerkUserId: input.clerkUserId,
        primaryEmail: input.primaryEmail ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        imageUrl: input.imageUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return toUserMirrorRecord(created)
  }

  const updateValues: {
    updatedAt: Date
    primaryEmail?: string | null
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
  } = {
    updatedAt: now,
  }

  if (input.primaryEmail !== undefined) {
    updateValues.primaryEmail = input.primaryEmail
  }
  if (input.firstName !== undefined) {
    updateValues.firstName = input.firstName
  }
  if (input.lastName !== undefined) {
    updateValues.lastName = input.lastName
  }
  if (input.imageUrl !== undefined) {
    updateValues.imageUrl = input.imageUrl
  }

  const [updated] = await db
    .update(users)
    .set(updateValues)
    .where(eq(users.id, existing.id))
    .returning()

  return toUserMirrorRecord(updated)
}

export async function deleteUserMirrorByClerkUserId(clerkUserId: string) {
  const db = getDbClient()

  if (!db) {
    inMemoryUsersByClerkId.delete(clerkUserId)
    return
  }

  await db.delete(users).where(eq(users.clerkUserId, clerkUserId))
}

export async function upsertGuestSession(input: UpsertGuestSessionInput) {
  const db = getDbClient()
  const now = new Date()
  const status = input.status ?? "active"

  if (!db) {
    const existing = inMemoryGuestSessions.get(input.guestId)

    if (existing) {
      inMemoryGuestSessions.set(input.guestId, {
        ...existing,
        status,
        linkedUserId: input.linkedUserId ?? existing.linkedUserId,
        expiresAt: input.expiresAt,
        updatedAt: now,
      })
      return
    }

    inMemoryGuestSessions.set(input.guestId, {
      id: input.guestId,
      status,
      linkedUserId: input.linkedUserId ?? null,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    return
  }

  await db
    .insert(guestSessions)
    .values({
      id: input.guestId,
      status,
      linkedUserId: input.linkedUserId ?? null,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: guestSessions.id,
      set: {
        status,
        linkedUserId: input.linkedUserId ?? null,
        expiresAt: input.expiresAt,
        updatedAt: now,
      },
    })
}

export async function linkGuestSessionToUser(input: {
  guestSessionId: string
  userId: string
}) {
  const db = getDbClient()
  const now = new Date()
  const linkId = createGuestUserLinkId()

  if (!db) {
    if (!inMemoryGuestLinks.has(input.guestSessionId)) {
      inMemoryGuestLinks.set(input.guestSessionId, {
        id: linkId,
        guestSessionId: input.guestSessionId,
        userId: input.userId,
        linkedAt: now,
      })
    }

    const guestSession = inMemoryGuestSessions.get(input.guestSessionId)
    if (guestSession) {
      inMemoryGuestSessions.set(input.guestSessionId, {
        ...guestSession,
        status: "linked",
        linkedUserId: input.userId,
        updatedAt: now,
      })
    }
    return
  }

  await db
    .insert(guestUserLinks)
    .values({
      id: linkId,
      guestSessionId: input.guestSessionId,
      userId: input.userId,
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: guestUserLinks.guestSessionId,
    })

  await db
    .update(guestSessions)
    .set({
      status: "linked",
      linkedUserId: input.userId,
      updatedAt: now,
    })
    .where(eq(guestSessions.id, input.guestSessionId))
}

export async function findUserByClerkUserId(clerkUserId: string) {
  const db = getDbClient()

  if (!db) {
    return inMemoryUsersByClerkId.get(clerkUserId) ?? null
  }

  const row = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  })

  return row ? toUserMirrorRecord(row) : null
}

export async function isWebhookEventProcessed(eventId: string) {
  const db = getDbClient()

  if (!db) {
    return inMemoryWebhookEvents.has(eventId)
  }

  const row = await db.query.clerkWebhookEvents.findFirst({
    where: eq(clerkWebhookEvents.id, eventId),
  })

  return Boolean(row)
}

export async function markWebhookEventProcessed(input: {
  eventId: string
  eventType: string
}) {
  const db = getDbClient()
  const now = new Date()

  if (!db) {
    inMemoryWebhookEvents.add(input.eventId)
    return
  }

  await db
    .insert(clerkWebhookEvents)
    .values({
      id: input.eventId,
      eventType: input.eventType,
      processedAt: now,
      createdAt: now,
    })
    .onConflictDoNothing({
      target: clerkWebhookEvents.id,
    })
}

export async function findGuestSessionLink(guestSessionId: string, userId: string) {
  const db = getDbClient()

  if (!db) {
    const link = inMemoryGuestLinks.get(guestSessionId)
    return Boolean(link && link.userId === userId)
  }

  const row = await db.query.guestUserLinks.findFirst({
    where: and(
      eq(guestUserLinks.guestSessionId, guestSessionId),
      eq(guestUserLinks.userId, userId)
    ),
  })

  return Boolean(row)
}

function toUserMirrorRecord(row: typeof users.$inferSelect): UserMirrorRecord {
  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    primaryEmail: row.primaryEmail,
    firstName: row.firstName,
    lastName: row.lastName,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function createUserId() {
  return `usr_${randomUUID().replaceAll("-", "")}`
}

function createGuestUserLinkId() {
  return `gul_${randomUUID().replaceAll("-", "")}`
}

export function resetAuthRepositoryInMemoryStateForTests() {
  logFlightFlow("auth.repository", "reset_in_memory_state_for_tests")
  inMemoryUsersByClerkId.clear()
  inMemoryGuestSessions.clear()
  inMemoryGuestLinks.clear()
  inMemoryWebhookEvents.clear()
}
