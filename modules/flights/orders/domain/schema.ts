import { z } from "zod"

const BOOKING_REFERENCE_PATTERN = /^[A-Z0-9-]{6,32}$/

export const bookingLookupInputSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(BOOKING_REFERENCE_PATTERN, "Enter a valid booking reference"),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
})

export const bookingListInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export const bookingDetailInputSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(BOOKING_REFERENCE_PATTERN, "Invalid booking reference"),
})

export type BookingLookupInput = z.infer<typeof bookingLookupInputSchema>
export type BookingListInput = z.infer<typeof bookingListInputSchema>
export type BookingDetailInput = z.infer<typeof bookingDetailInputSchema>
