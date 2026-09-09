"use server"

import { getLiteApiClient } from "@/lib/liteapi"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import { defaultHotelOrderRepository } from "@/modules/hotels/checkout/server/order-repository"
import { getDbClient, hotelCancellationRequests } from "@/lib/db"

export async function requestHotelCancellationAction(
  bookingReference: string,
  customerReason: string
): Promise<ActionResult<{ success: boolean; cancellationId?: string }>> {
  logHotelFlow("requestHotelCancellationAction", "started", { bookingReference })

  const order = await defaultHotelOrderRepository.findByBookingReference(bookingReference)
  if (!order) {
    return actionFailure("VALIDATION_ERROR", "Hotel booking not found.")
  }

  const client = getLiteApiClient()

  try {
    // 1. LiteAPI Cancel Booking
    // This assumes LiteAPI uses POST /bookings/cancel
    const cancelResponse = await client.post<any>("/bookings/cancel", {
      bookingId: order.liteapiOrderId
    })

    const db = getDbClient()
    if (db) {
      // 2. Persist cancellation request in database
      await db.insert(hotelCancellationRequests).values({
        id: `hcr_${Date.now()}`,
        hotelOrderId: order.id,
        bookingReference: order.bookingReference,
        liteapiOrderId: order.liteapiOrderId,
        customerReason: customerReason,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    logHotelFlow("requestHotelCancellationAction", "success", { bookingReference })
    return actionSuccess({ success: true, cancellationId: cancelResponse.data?.cancellationId })
  } catch (error) {
    logHotelFlowError("requestHotelCancellationAction", "failed", error)
    return actionFailure("UPSTREAM_ERROR", "Failed to cancel hotel booking.")
  }
}
