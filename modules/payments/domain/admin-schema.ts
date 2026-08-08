import { z } from "zod"

export const adminPaymentStatusValues = [
  "all",
  "paid",
  "pending",
  "attention",
  "refunded",
] as const

export const adminRefundStatusValues = [
  "all",
  "none",
  "pending",
  "completed",
  "failed",
] as const

export const adminPaymentSortValues = [
  "newest",
  "oldest",
  "amount_high",
  "amount_low",
] as const

const pageSchema = z.coerce.number().int().min(1).default(1)
const pageSizeSchema = z.coerce.number().int().min(10).max(50).default(20)
const searchSchema = z
  .string()
  .trim()
  .max(160)
  .transform((value) => value || undefined)
  .optional()
const paymentStatusSchema = z.enum(adminPaymentStatusValues).default("all")
const refundStatusSchema = z.enum(adminRefundStatusValues).default("all")
const sortSchema = z.enum(adminPaymentSortValues).default("newest")

const adminPaymentListSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  q: searchSchema,
  paymentStatus: paymentStatusSchema,
  refundStatus: refundStatusSchema,
  sort: sortSchema,
})

export type AdminPaymentListQuery = z.infer<typeof adminPaymentListSchema>

export function parseAdminPaymentListQuery(input: {
  page?: unknown
  pageSize?: unknown
  q?: unknown
  paymentStatus?: unknown
  refundStatus?: unknown
  sort?: unknown
}): AdminPaymentListQuery {
  const page = pageSchema.safeParse(input.page)
  const pageSize = pageSizeSchema.safeParse(input.pageSize)
  const q = searchSchema.safeParse(input.q)
  const paymentStatus = paymentStatusSchema.safeParse(input.paymentStatus)
  const refundStatus = refundStatusSchema.safeParse(input.refundStatus)
  const sort = sortSchema.safeParse(input.sort)

  return adminPaymentListSchema.parse({
    page: page.success ? page.data : 1,
    pageSize: pageSize.success ? pageSize.data : 20,
    q: q.success ? q.data : undefined,
    paymentStatus: paymentStatus.success ? paymentStatus.data : "all",
    refundStatus: refundStatus.success ? refundStatus.data : "all",
    sort: sort.success ? sort.data : "newest",
  })
}
