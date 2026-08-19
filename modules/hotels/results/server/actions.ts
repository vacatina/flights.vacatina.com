"use server"

import { getLiteApiClient } from "@/lib/liteapi"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"
import { mapLiteApiRatesResponse, type HotelRateResult } from "@/modules/hotels/results/domain"

export async function fetchHotelRatesAction(
  command: HotelSearchCommand
): Promise<ActionResult<HotelRateResult[]>> {
  logHotelFlow("fetchHotelRatesAction", "started", { command })
  const client = getLiteApiClient()

  try {
    // LiteAPI uses POST /hotels/rates or /rates to get real-time availability
    const response = await client.post<{ data: any[] }>("/rates", {
      cityIds: command.cityId ? [command.cityId] : undefined,
      checkin: command.checkin,
      checkout: command.checkout,
      occupancies: [
        {
          adults: command.adults,
          children: command.children,
        }
      ],
      guestNationality: command.guestNationality,
      currency: command.currency,
    })

    const results = mapLiteApiRatesResponse(response)
    logHotelFlow("fetchHotelRatesAction", "success", { resultCount: results.length })
    
    return actionSuccess(results)
  } catch (error) {
    logHotelFlowError("fetchHotelRatesAction", "failed", error)
    return actionFailure("UPSTREAM_ERROR", "Failed to retrieve hotel rates from supplier.")
  }
}
