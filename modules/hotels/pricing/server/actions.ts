"use server"

import { getLiteApiClient } from "@/lib/liteapi"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import type { RoomOffer } from "@/modules/hotels/results/domain"

export async function verifyRoomRateAction(
  rateId: string
): Promise<ActionResult<{ isAvailable: boolean; offer?: RoomOffer }>> {
  logHotelFlow("verifyRoomRateAction", "started", { rateId })
  const client = getLiteApiClient()

  try {
    // LiteAPI might have a specific re-check/prebook endpoint to verify if the rate is still valid
    // E.g. POST /rates/prebook
    const response = await client.post<any>("/rates/prebook", { rateId })

    if (response.data && response.data.price) {
      logHotelFlow("verifyRoomRateAction", "success", { rateId })
      return actionSuccess({
        isAvailable: true,
        offer: {
          id: response.data.rateId,
          name: response.data.roomName || "Selected Room",
          price: response.data.price,
          currency: response.data.currency,
          cancellationPolicy: response.data.cancellationPolicy || "Unknown",
        }
      })
    }

    return actionSuccess({ isAvailable: false })
  } catch (error) {
    logHotelFlowError("verifyRoomRateAction", "failed", error)
    return actionFailure("UPSTREAM_ERROR", "Could not verify the room rate.")
  }
}
