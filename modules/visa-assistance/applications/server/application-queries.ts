import "server-only"
import { and, asc, count, desc, eq, ilike, ne, or } from "drizzle-orm"
import {
  visaApplicationDocuments,
  visaApplicationEvents,
  visaApplications,
  visaApplicationTravelers,
} from "@/lib/db/schema"
import {
  visaListingSnapshotSchema,
  visaApplicationPricingSnapshotSchema,
  type VisaApplicationDetail,
  type VisaApplicationStatus,
} from "../domain"
import { requireDb, type VisaExecutor } from "./application-database"
export async function findVisaApplicationById(
  applicationId: string,
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
  return db.query.visaApplications.findFirst({
    where: eq(visaApplications.id, applicationId),
  })
}

export async function getVisaApplicationDetail(
  applicationId: string,
  executor?: VisaExecutor
): Promise<VisaApplicationDetail | null> {
  const db = executor ?? requireDb()
  const application = await findVisaApplicationById(applicationId, db)

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

  return {
    application: {
      ...application,
      listingSnapshot: visaListingSnapshotSchema.parse(
        application.listingSnapshot
      ),
      pricingSnapshot: visaApplicationPricingSnapshotSchema.parse(
        application.pricingSnapshot
      ),
    },
    travelers,
    documents,
  }
}

export async function listAdminVisaApplications(
  input: {
    query?: string
    status?: VisaApplicationStatus
    limit?: number
    offset?: number
  } = {},
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
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

export async function listOwnedVisaApplications(
  input: {
    ownerUserId: string
    limit: number
    offset: number
  },
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
  const ownerCondition = eq(visaApplications.ownerUserId, input.ownerUserId)

  const [items, totalRows, statusRows] = await Promise.all([
    db
      .select()
      .from(visaApplications)
      .where(ownerCondition)
      .orderBy(desc(visaApplications.updatedAt))
      .limit(input.limit)
      .offset(input.offset),
    db.select({ count: count() }).from(visaApplications).where(ownerCondition),
    db
      .select({ status: visaApplications.status, count: count() })
      .from(visaApplications)
      .where(ownerCondition)
      .groupBy(visaApplications.status),
  ])

  return {
    items,
    total: totalRows[0]?.count ?? 0,
    statusCounts: Object.fromEntries(
      statusRows.map((row) => [row.status, row.count])
    ),
  }
}

export async function getAdminVisaApplicationDetail(
  applicationId: string,
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
  const detail = await getVisaApplicationDetail(applicationId, db)

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
