import "server-only"

import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

import { users, visaListingEvents, visaListings } from "@/lib/db/schema"
import { visaCountries } from "@/modules/visa-assistance/domain/countries"
import { catalogDatabase } from "./database"

export async function listAdminVisaListings(
  input: {
    status?: "draft" | "published"
    search?: string
    page?: number
  } = {}
) {
  const db = catalogDatabase()
  const pageSize = 20
  const page = Math.max(1, Math.min(Math.trunc(input.page ?? 1) || 1, 10000))
  const search = input.search?.trim().slice(0, 120)
  const matchingCodes = search
    ? visaCountries
        .filter(
          (country) =>
            country.name.toLowerCase().includes(search.toLowerCase()) ||
            country.code.toLowerCase() === search.toLowerCase()
        )
        .map((country) => country.code)
    : []
  const pattern = `%${search?.replace(/[\\%_]/g, "\\$&") ?? ""}%`
  const where = and(
    input.status ? eq(visaListings.status, input.status) : undefined,
    search
      ? or(
          ilike(visaListings.title, pattern),
          ilike(visaListings.code, pattern),
          matchingCodes.length
            ? inArray(visaListings.nationalityCode, matchingCodes)
            : undefined,
          matchingCodes.length
            ? inArray(visaListings.destinationCode, matchingCodes)
            : undefined
        )
      : undefined
  )
  const [total] = await db
    .select({ value: count() })
    .from(visaListings)
    .where(where)
  const totalPages = Math.max(1, Math.ceil(total.value / pageSize))
  const currentPage = Math.min(page, totalPages)
  const rows = await db
    .select({
      listing: visaListings,
      documentCount: sql<number>`(
      select count(*) from visa_listing_documents
      where listing_id = ${visaListings.id}
    )`.mapWith(Number),
      updatedByEmail: users.primaryEmail,
    })
    .from(visaListings)
    .leftJoin(users, eq(visaListings.updatedBy, users.id))
    .where(where)
    .orderBy(desc(visaListings.updatedAt), desc(visaListings.id))
    .limit(pageSize)
    .offset((currentPage - 1) * pageSize)

  return { rows, total: total.value, page: currentPage, totalPages }
}

export async function listVisaListingEvents(listingId: string) {
  return catalogDatabase()
    .select({
      id: visaListingEvents.id,
      eventType: visaListingEvents.eventType,
      createdAt: visaListingEvents.createdAt,
      actorEmail: users.primaryEmail,
    })
    .from(visaListingEvents)
    .leftJoin(users, eq(visaListingEvents.actorUserId, users.id))
    .where(eq(visaListingEvents.listingId, listingId))
    .orderBy(desc(visaListingEvents.createdAt), desc(visaListingEvents.id))
    .limit(20)
}

export type AdminVisaListingPage = Awaited<
  ReturnType<typeof listAdminVisaListings>
>
export type VisaListingAuditEvent = Awaited<
  ReturnType<typeof listVisaListingEvents>
>[number]
