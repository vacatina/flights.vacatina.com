import { z } from "zod"

import {
  flightCancellationFeeTypes,
  flightCancellationStatuses,
  flightRefundStatuses,
} from "@/modules/flights/cancellations/domain/types"

const amountSchema = z.coerce.number().finite().min(0)
const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase())

export const createFlightCancellationRequestInputSchema = z
  .object({
    flightOrderId: z.string().trim().min(1),
    bookingReference: z.string().trim().min(1).max(40),
    duffelOrderId: z.string().trim().min(1),
    requestedByUserId: z.string().trim().min(1).nullish(),
    requestedByGuestId: z.string().trim().min(1).nullish(),
    customerReason: z.string().trim().min(10).max(2_000),
    duffelApiAvailable: z.boolean().nullish(),
  })
  .superRefine((value, ctx) => {
    if (!value.requestedByUserId && !value.requestedByGuestId) {
      ctx.addIssue({
        code: "custom",
        path: ["requestedByUserId"],
        message: "A signed-in user or guest requester is required",
      })
    }
  })

export const adminFlightCancellationUpdateSchema = z
  .object({
    status: z.enum(flightCancellationStatuses).optional(),
    adminFeeType: z.enum(flightCancellationFeeTypes).optional(),
    adminFeeValue: amountSchema.optional(),
    adminFeeAmount: amountSchema.optional(),
    customerRefundAmount: amountSchema.optional(),
    customerRefundCurrency: currencySchema.optional(),
    customerMessage: z.string().trim().max(2_000).nullish(),
    cutoffOverrideReason: z.string().trim().max(1_000).nullish(),
    cancellationApprovedBy: z.string().trim().min(1).optional(),
    adminRejectionReason: z.string().trim().max(1_000).nullish(),
  })
  .superRefine((value, ctx) => {
    if (
      value.adminFeeType === "none" &&
      value.adminFeeValue &&
      value.adminFeeValue > 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["adminFeeValue"],
        message: "No-fee cancellations must use a zero fee value",
      })
    }

    if (value.status === "rejected" && !value.adminRejectionReason) {
      ctx.addIssue({
        code: "custom",
        path: ["adminRejectionReason"],
        message: "A rejection reason is required when rejecting a cancellation",
      })
    }
  })

export const flightRefundApprovalSchema = z.object({
  cancellationRequestId: z.string().trim().min(1),
  refundApprovedBy: z.string().trim().min(1),
  amount: amountSchema,
  currency: currencySchema,
  status: z.enum(flightRefundStatuses).default("approved"),
})

export type CreateFlightCancellationRequestInput = z.infer<
  typeof createFlightCancellationRequestInputSchema
>
export type AdminFlightCancellationUpdateInput = z.infer<
  typeof adminFlightCancellationUpdateSchema
>
export type FlightRefundApprovalInput = z.infer<
  typeof flightRefundApprovalSchema
>

export function parseCreateFlightCancellationRequestInput(input: unknown) {
  return createFlightCancellationRequestInputSchema.parse(input)
}

export function parseAdminFlightCancellationUpdate(input: unknown) {
  return adminFlightCancellationUpdateSchema.parse(input)
}

export function parseFlightRefundApproval(input: unknown) {
  return flightRefundApprovalSchema.parse(input)
}
