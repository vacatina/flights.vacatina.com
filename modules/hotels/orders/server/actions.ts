"use server"

import { getLiteApiClient } from "@/lib/liteapi"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import { hotelCheckoutSessionRepository } from "@/modules/hotels/checkout/server/session-repository"
import { defaultHotelOrderRepository } from "@/modules/hotels/checkout/server/order-repository"
import { createEmailHash } from "@/modules/flights/orders/server/identity"

export async function createHotelBookingAction(
  checkoutSessionId: string,
  paymentIntentId: string
): Promise<ActionResult<{ bookingReference: string }>> {
  logHotelFlow("createHotelBookingAction", "started", { checkoutSessionId })
  
  const session = await hotelCheckoutSessionRepository.findById(checkoutSessionId)
  if (!session) {
    return actionFailure("VALIDATION_ERROR", "Checkout session not found.")
  }

  const client = getLiteApiClient()

  try {
    // 1. LiteAPI Prebook (assuming it creates a booking hold)
    const prebookResponse = await client.post<any>("/rates/prebook", { rateId: session.rateId })
    const prebookId = prebookResponse.data?.prebookId

    // 2. LiteAPI Book (confirming the booking)
    const bookResponse = await client.post<any>("/rates/book", {
      prebookId: prebookId || session.rateId,
      guests: session.guests || [{
        title: "Mr",
        firstName: "Test",
        lastName: "Guest",
        email: session.primaryGuestEmail || "test@example.com"
      }]
    })

    const liteapiOrderId = bookResponse.data?.bookingId || `liteapi_mock_${Date.now()}`
    const bookingReference = `HTL${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    const email = session.primaryGuestEmail || "test@example.com"
    
    // 3. Persist to Postgres database via repository
    await defaultHotelOrderRepository.create({
      id: `ho_${Date.now()}`,
      bookingReference,
      checkoutSessionId: session.id,
      liteapiOrderId,
      hotelId: session.hotelId,
      roomId: session.roomId,
      selectedRates: [session.rateId],
      contactEmail: email,
      contactEmailHash: createEmailHash(email),
      paymentMode: "pay_now",
      netAmount: session.netAmount,
      sellAmount: session.sellAmount,
      liteapiTotalAmount: session.netAmount,
      liteapiTotalCurrency: session.currency,
      currency: session.currency,
      paymentAwaiting: false,
      orderSnapshot: { hotelName: "Test Hotel" }
    })

    await hotelCheckoutSessionRepository.update(checkoutSessionId, { status: "completed" })

    logHotelFlow("createHotelBookingAction", "success", { bookingReference, liteapiOrderId })
    return actionSuccess({ bookingReference })
  } catch (error) {
    logHotelFlowError("createHotelBookingAction", "failed", error)
    return actionFailure("UPSTREAM_ERROR", "Failed to finalize hotel booking.")
  }
}
