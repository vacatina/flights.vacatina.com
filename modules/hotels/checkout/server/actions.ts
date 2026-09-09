"use server"

import { z } from "zod"
import { resolveActionActorContext } from "@/modules/auth/server"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import { getLiteApiClient } from "@/lib/liteapi/client"

const checkoutSubmitSchema = z.object({
  prebookId: z.string().min(1),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  paymentMethod: z.enum(["card", "paypal"]).default("card"),
})

export async function processHotelCheckoutAction(
  input: unknown
): Promise<ActionResult<{ bookingReference: string }>> {
  let actor
  try {
    actor = await resolveActionActorContext({
      scope: "hotels.checkout.actions",
    })
  } catch (error) {
    logHotelFlowError("processHotelCheckoutAction", "actor_resolution_failed", error, {
      inputType: typeof input,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not verify the current session. Please refresh and try again."
    )
  }

  logHotelFlow("processHotelCheckoutAction", "received_input", {
    inputType: typeof input,
    actorType: actor.type,
  })

  const parsed = checkoutSubmitSchema.safeParse(input)

  if (!parsed.success) {
    logHotelFlow("processHotelCheckoutAction", "validation_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return actionFailure("VALIDATION_ERROR", "Invalid checkout submission")
  }

  const { prebookId, firstName, lastName, email, phone } = parsed.data

  try {
    const client = getLiteApiClient()

    logHotelFlow("processHotelCheckoutAction", "booking_started", {
      prebookId,
    })

    // In a real application, we would use Stripe/PayPal to authorize payment here.
    // Since this is Phase 2.2, we simulate payment and directly book via LiteAPI using sandbox payment.
    const bookingPayload = {
      prebookId,
      holder: {
        firstName,
        lastName,
        email,
        phone,
      },
      guests: [
        {
          occupancyNumber: 1,
          firstName,
          lastName,
          email,
          phone,
        }
      ],
      payment: {
        method: "ACC_CREDIT_CARD" // Sandbox testing method
      }
    }

    const response = await client.post<{ bookingId: string; hotelConfirmationCode?: string }>(
      "/rates/book",
      bookingPayload
    )

    if (!response.bookingId) {
      throw new Error("Missing bookingId in LiteAPI response")
    }

    logHotelFlow("processHotelCheckoutAction", "booking_succeeded", {
      prebookId,
      bookingId: response.bookingId,
    })

    return actionSuccess({
      bookingReference: response.bookingId,
    })
  } catch (error) {
    logHotelFlowError("processHotelCheckoutAction", "booking_failed", error, {
      prebookId: parsed.data.prebookId,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      "Could not finalize your booking. Please try again."
    )
  }
}
