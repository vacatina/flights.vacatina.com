import "server-only"
import { randomUUID } from "node:crypto"
import { and, eq, inArray, isNull } from "drizzle-orm"
import {
  visaApplicationEvents,
  visaApplications,
  visaApplicationTravelers,
  type NewVisaApplicationRow,
  type NewVisaApplicationTravelerRow,
} from "@/lib/db/schema"
import { createVisaApplicationEventId, createVisaTravelerId } from "./ids"
import type { VisaApplicationStatus } from "../domain"
import { VisaApplicationError } from "../domain/application-error"
import { requireDb, type VisaExecutor } from "./application-database"
export async function createVisaApplication(
  application: NewVisaApplicationRow,
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()

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

export async function updateVisaApplication(
  applicationId: string,
  values: Partial<NewVisaApplicationRow>,
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
  const [updated] = await db
    .update(visaApplications)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(visaApplications.id, applicationId))
    .returning()

  return updated ?? null
}

export async function saveVisaApplicationTravelers(
  applicationId: string,
  travelers: Array<Omit<NewVisaApplicationTravelerRow, "id" | "applicationId">>,
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()

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

export async function addVisaApplicationEvent(
  input: {
    applicationId: string
    actorUserId: string | null
    eventType: string
    metadata?: Record<string, unknown>
  },
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
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

export async function submitVisaApplicationRecord(
  input: {
    applicationId: string
    actorUserId: string
    pricingSnapshot: NonNullable<NewVisaApplicationRow["pricingSnapshot"]>
  },
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()

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
      throw new VisaApplicationError(
        "This visa request has already been submitted."
      )
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

export async function updateAdminVisaApplication(
  input: {
    applicationId: string
    status: VisaApplicationStatus
    internalNotes: string | null
    actorUserId: string
  },
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()

  return db.transaction(async (transaction) => {
    const [application] = await transaction
      .update(visaApplications)
      .set({
        status: input.status,
        internalNotes: input.internalNotes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(visaApplications.id, input.applicationId),
          input.status === "draft"
            ? isNull(visaApplications.submittedAt)
            : undefined
        )
      )
      .returning()

    if (!application) {
      if (input.status === "draft") {
        throw new VisaApplicationError(
          "Submitted requests cannot return to draft."
        )
      }
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
