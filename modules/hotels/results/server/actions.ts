"use server"

import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"
import { searchLiteApiRates } from "@/modules/hotels/results/server/liteapi-rates"

export async function fetchHotelRatesAction(
  command: HotelSearchCommand
): Promise<ActionResult<any>> {
  logHotelFlow("fetchHotelRatesAction", "started", { command })

  try {
    const response = await searchLiteApiRates(command)
    logHotelFlow("fetchHotelRatesAction", "success", { 
      resultCount: response.hotels?.length ?? 0 
    })
    
    return actionSuccess(response)
  } catch (error) {
    logHotelFlowError("fetchHotelRatesAction", "failed", error)
    return actionFailure("UPSTREAM_ERROR", "Failed to retrieve hotel rates from supplier.")
  }
}
