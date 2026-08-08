import { z } from "zod"

export const adminBookingStatusValues = [
  "all",
  "confirmed",
  "payment_pending",
  "on_hold",
  "cancellation_in_progress",
  "cancelled",
] as const

export const adminBookingSortValues = [
  "newest",
  "oldest",
  "amount_high",
  "amount_low",
] as const

const pageSchema = z.coerce.number().int().min(1).default(1)
const pageSizeSchema = z.coerce.number().int().min(10).max(50).default(20)
const searchSchema = z.string().trim().max(120).transform((value) => value || undefined).optional()
const statusSchema = z.enum(adminBookingStatusValues).default("all")
const sortSchema = z.enum(adminBookingSortValues).default("newest")

const adminBookingListSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  q: searchSchema,
  status: statusSchema,
  sort: sortSchema,
})

export type AdminBookingListQuery = z.infer<typeof adminBookingListSchema>

export function parseAdminBookingListQuery(input: {
  page?: unknown
  pageSize?: unknown
  q?: unknown
  status?: unknown
  sort?: unknown
}): AdminBookingListQuery {
  const page = pageSchema.safeParse(input.page)
  const pageSize = pageSizeSchema.safeParse(input.pageSize)
  const q = searchSchema.safeParse(input.q)
  const status = statusSchema.safeParse(input.status)
  const sort = sortSchema.safeParse(input.sort)

  return adminBookingListSchema.parse({
    page: page.success ? page.data : 1,
    pageSize: pageSize.success ? pageSize.data : 20,
    q: q.success ? q.data : undefined,
    status: status.success ? status.data : "all",
    sort: sort.success ? sort.data : "newest",
  })
}
