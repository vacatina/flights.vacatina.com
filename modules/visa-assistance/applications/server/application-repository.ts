import "server-only"

import { randomUUID } from "node:crypto"
import { and, asc, desc, eq, ilike, inArray, ne, or } from "drizzle-orm"

import { getDbClient } from "@/lib/db/client"
import {
  visaApplicationDocuments,
  visaApplicationEvents,
  visaApplications,
  visaApplicationTravelers,
  type NewVisaApplicationRow,
  type NewVisaApplicationTravelerRow,
  type VisaApplicationDocumentRow,
  type VisaApplicationRow,
} from "@/lib/db/schema"
import type {
  VisaApplicationDetail,
  VisaApplicationStatus,
} from "@/modules/visa-assistance/applications/domain"
import {
  createVisaApplicationEventId,
  createVisaTravelerId,
} from "@/modules/visa-assistance/applications/server/ids"

function requireDb() {
  const db = getDbClient()

  if (!db) {
    throw new Error("Database is not configured.")
  }

  return db
}

export async function createVisaApplication(
  application: NewVisaApplicationRow
) {
  const db = requireDb()

  return db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(visaApplications)
      .values(application)
      .returning()

    await transaction.insert(visaApplicationEvents).values({
      id: createVisaApplicationEventId(),
      applicationId: application.id,
      actorUserId: application.ownerUserId,
      eventType: "draft_created",
    })

    return created
  })
}

export async function findVisaApplicationById(applicationId: string) {
  const db = requireDb()
  return db.query.visaApplications.findFirst({
    where: eq(visaApplications.id, applicationId),
  })
}

export async function getVisaApplicationDetail(
  applicationId: string
): Promise<VisaApplicationDetail | null> {
  const db = requireDb()
  const application = await findVisaApplicationById(applicationId)

  if (!application) {
    return null
  }

  const [travelers, documents] = await Promise.all([
    db
      .select()
      .from(visaApplicationTravelers)
      .where(eq(visaApplicationTravelers.applicationId, applicationId))
      .orderBy(asc(visaApplicationTravelers.position)),
    db
      .select()
      .from(visaApplicationDocuments)
      .where(
        and(
          eq(visaApplicationDocuments.applicationId, applicationId),
          ne(visaApplicationDocuments.status, "deleted")
        )
      )
      .orderBy(asc(visaApplicationDocuments.createdAt)),
  ])

  return { application, travelers, documents }
}

export async function updateVisaApplication(
  applicationId: string,
  values: Partial<NewVisaApplicationRow>
) {
  const db = requireDb()
  const [updated] = await db
    .update(visaApplications)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(visaApplications.id, applicationId))
    .returning()

  return updated ?? null
}

export async function saveVisaApplicationTravelers(
  applicationId: string,
  travelers: Array<Omit<NewVisaApplicationTravelerRow, "id" | "applicationId">>
) {
  const db = requireDb()

  return db.transaction(async (transaction) => {
    const existing = await transaction
      .select()
      .from(visaApplicationTravelers)
      .where(eq(visaApplicationTravelers.applicationId, applicationId))
    const byPosition = new Map(
      existing.map((traveler) => [traveler.position, traveler])
    )
    const saved = []

    for (const traveler of travelers) {
      const current = byPosition.get(traveler.position)

      if (current) {
        const [updated] = await transaction
          .update(visaApplicationTravelers)
          .set({ ...traveler, updatedAt: new Date() })
          .where(eq(visaApplicationTravelers.id, current.id))
          .returning()
        saved.push(updated)
        continue
      }

      const [created] = await transaction
        .insert(visaApplicationTravelers)
        .values({
          ...traveler,
          id: createVisaTravelerId(),
          applicationId,
        })
        .returning()
      saved.push(created)
    }

    const savedPositions = travelers.map((traveler) => traveler.position)
    const removed = existing.filter(
      (traveler) => !savedPositions.includes(traveler.position)
    )

    if (removed.length > 0) {
      await transaction.delete(visaApplicationTravelers).where(
        inArray(
          visaApplicationTravelers.id,
          removed.map((traveler) => traveler.id)
        )
      )
    }

    return saved
  })
}

export async function addVisaApplicationEvent(input: {
  applicationId: string
  actorUserId: string | null
  eventType: string
  metadata?: Record<string, unknown>
}) {
  const db = requireDb()
  const [event] = await db
    .insert(visaApplicationEvents)
    .values({
      id: createVisaApplicationEventId(),
      ...input,
      metadata: input.metadata ?? null,
    })
    .returning()

  return event
}

export async function createVisaApplicationDocument(
  document: typeof visaApplicationDocuments.$inferInsert
) {
  const db = requireDb()
  const [created] = await db
    .insert(visaApplicationDocuments)
    .values(document)
    .returning()
  return created
}

export async function findVisaApplicationDocument(documentId: string) {
  const db = requireDb()
  return db.query.visaApplicationDocuments.findFirst({
    where: eq(visaApplicationDocuments.id, documentId),
  })
}

export async function updateVisaApplicationDocument(
  documentId: string,
  values: Partial<typeof visaApplicationDocuments.$inferInsert>
) {
  const db = requireDb()
  const [updated] = await db
    .update(visaApplicationDocuments)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(visaApplicationDocuments.id, documentId))
    .returning()
  return updated ?? null
}

export async function submitVisaApplicationRecord(input: {
  applicationId: string
  actorUserId: string
  pricingSnapshot: NonNullable<NewVisaApplicationRow["pricingSnapshot"]>
}) {
  const db = requireDb()

  return db.transaction(async (transaction) => {
    const submittedAt = new Date()
    const [application] = await transaction
      .update(visaApplications)
      .set({
        status: "submitted",
        pricingSnapshot: input.pricingSnapshot,
        submittedAt,
        updatedAt: submittedAt,
      })
      .where(
        and(
          eq(visaApplications.id, input.applicationId),
          eq(visaApplications.status, "draft")
        )
      )
      .returning()

    if (!application) {
      throw new Error("This visa request has already been submitted.")
    }

    await transaction.insert(visaApplicationEvents).values({
      id: createVisaApplicationEventId(),
      applicationId: input.applicationId,
      actorUserId: input.actorUserId,
      eventType: "application_submitted",
      metadata: { reference: application.reference },
    })

    return application
  })
}

export async function listAdminVisaApplications(
  input: {
    query?: string
    status?: VisaApplicationStatus
    limit?: number
    offset?: number
  } = {}
) {
  const db = requireDb()
  const conditions = []

  if (input.status) {
    conditions.push(eq(visaApplications.status, input.status))
  }

  if (input.query?.trim()) {
    const query = `%${input.query.trim()}%`
    conditions.push(
      or(
        ilike(visaApplications.reference, query),
        ilike(visaApplications.contactEmail, query),
        ilike(visaApplications.visaName, query)
      )!
    )
  }

  return db
    .select()
    .from(visaApplications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(visaApplications.updatedAt))
    .limit(input.limit ?? 100)
    .offset(input.offset ?? 0)
}

export async function getAdminVisaApplicationDetail(applicationId: string) {
  const db = requireDb()
  const detail = await getVisaApplicationDetail(applicationId)

  if (!detail) {
    return null
  }

  const events = await db
    .select()
    .from(visaApplicationEvents)
    .where(eq(visaApplicationEvents.applicationId, applicationId))
    .orderBy(desc(visaApplicationEvents.createdAt))

  return { ...detail, events }
}

export async function updateAdminVisaApplication(input: {
  applicationId: string
  status: VisaApplicationStatus
  internalNotes: string | null
  actorUserId: string
}) {
  const db = requireDb()

  return db.transaction(async (transaction) => {
    const [application] = await transaction
      .update(visaApplications)
      .set({
        status: input.status,
        internalNotes: input.internalNotes,
        updatedAt: new Date(),
      })
      .where(eq(visaApplications.id, input.applicationId))
      .returning()

    if (!application) {
      return null
    }

    await transaction.insert(visaApplicationEvents).values({
      id: `vae_${randomUUID().replaceAll("-", "")}`,
      applicationId: input.applicationId,
      actorUserId: input.actorUserId,
      eventType: "admin_updated",
      metadata: { status: input.status },
    })

    return application
  })
}

export type VisaApplicationDocumentRecord = VisaApplicationDocumentRow
export type VisaApplicationRecord = VisaApplicationRow
