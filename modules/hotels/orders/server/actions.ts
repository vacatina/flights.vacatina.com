"use server"

import { z } from "zod"
import { resolveActionActorContext } from "@/modules/auth/server"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"

const voucherSchema = z.object({
  bookingReference: z.string().min(1),
})

export async function generateHotelVoucherAction(
  input: unknown
): Promise<ActionResult<{ voucherUrl: string }>> {
  let actor
  try {
    actor = await resolveActionActorContext({
      scope: "hotels.orders.actions",
    })
  } catch (error) {
    logHotelFlowError("generateHotelVoucherAction", "actor_resolution_failed", error, {
      inputType: typeof input,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not verify the current session. Please refresh and try again."
    )
  }

  logHotelFlow("generateHotelVoucherAction", "received_input", {
    inputType: typeof input,
    actorType: actor.type,
  })

  const parsed = voucherSchema.safeParse(input)

  if (!parsed.success) {
    logHotelFlow("generateHotelVoucherAction", "validation_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return actionFailure("VALIDATION_ERROR", "Invalid voucher request")
  }

  const { bookingReference } = parsed.data

  try {
    logHotelFlow("generateHotelVoucherAction", "generation_started", {
      bookingReference,
    })

    // Simulated voucher generation delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In a real application, we would call a PDF generation microservice
    // or retrieve the voucherUrl directly from the LiteAPI booking object.
    const mockVoucherUrl = `/api/hotels/vouchers/${bookingReference}/download.pdf`

    logHotelFlow("generateHotelVoucherAction", "generation_succeeded", {
      bookingReference,
      voucherUrl: mockVoucherUrl,
    })

    return actionSuccess({
      voucherUrl: mockVoucherUrl,
    })
  } catch (error) {
    logHotelFlowError("generateHotelVoucherAction", "generation_failed", error, {
      bookingReference: parsed.data.bookingReference,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not generate your voucher right now. Please try again."
    )
  }
}
