import { z } from "zod"

const BOOKING_REFERENCE_PATTERN = /^[A-Z0-9-]{6,32}$/
export const bookingListStatusValues = [
  "all",
  "confirmed",
  "payment_pending",
  "on_hold",
] as const
export const bookingListSortValues = [
  "newest",
  "oldest",
  "amount_high",
  "amount_low",
] as const

export const bookingLookupInputSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(BOOKING_REFERENCE_PATTERN, "Enter a valid booking reference"),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
})

const bookingPageSchema = z.coerce.number().int().min(1).default(1)
const bookingPageSizeSchema = z.coerce.number().int().min(1).max(50).default(10)
const bookingSearchSchema = z
  .string()
  .trim()
  .max(40)
  .transform((value) => value || undefined)
  .optional()
const bookingStatusSchema = z.enum(bookingListStatusValues).default("all")
const bookingSortSchema = z.enum(bookingListSortValues).default("newest")

export const bookingListInputSchema = z.object({
  page: bookingPageSchema,
  pageSize: bookingPageSizeSchema,
  q: bookingSearchSchema,
  status: bookingStatusSchema,
  sort: bookingSortSchema,
})

export const bookingDetailInputSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(BOOKING_REFERENCE_PATTERN, "Invalid booking reference"),
})

export function parseBookingListQuery(input: {
  page?: unknown
  pageSize?: unknown
  q?: unknown
  status?: unknown
  sort?: unknown
}) {
  const page = bookingPageSchema.safeParse(input.page)
  const pageSize = bookingPageSizeSchema.safeParse(input.pageSize)
  const q = bookingSearchSchema.safeParse(input.q)
  const status = bookingStatusSchema.safeParse(input.status)
  const sort = bookingSortSchema.safeParse(input.sort)

  return bookingListInputSchema.parse({
    page: page.success ? page.data : 1,
    pageSize: pageSize.success ? pageSize.data : 10,
    q: q.success ? q.data : undefined,
    status: status.success ? status.data : "all",
    sort: sort.success ? sort.data : "newest",
  })
}

export type BookingLookupInput = z.infer<typeof bookingLookupInputSchema>
export type BookingListInput = z.infer<typeof bookingListInputSchema>
export type BookingDetailInput = z.infer<typeof bookingDetailInputSchema>
