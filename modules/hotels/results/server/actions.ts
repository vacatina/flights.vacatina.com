"use server"

import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"
import { getCachedLiteApiRates } from "@/modules/hotels/results/server/cached-rates"
import type { LiteApiHotelInfo, LiteApiRateResponseItem } from "@/modules/hotels/results/server/liteapi-rates"

export interface ProcessedHotelRate {
  hotel: LiteApiHotelInfo
  ratesData: LiteApiRateResponseItem
  lowestPrice?: number
  currency: string
}

export interface PaginatedHotelRatesResponse {
  hotels: ProcessedHotelRate[]
  totalCount: number
  globalMinPrice: number
  globalMaxPrice: number
}

export async function fetchHotelRatesAction(
  command: HotelSearchCommand
): Promise<ActionResult<PaginatedHotelRatesResponse>> {
  logHotelFlow("fetchHotelRatesAction", "started", { command })

  try {
    const response = await getCachedLiteApiRates(command)
    
    const dataList = response.data || []
    const hotelsMap = new Map((response.hotels || []).map(h => [h.id, h]))
    
    let globalMinPrice = Infinity
    let globalMaxPrice = 0

    let processedHotels = dataList.map((ratesData) => {
      const hotel = hotelsMap.get(ratesData.hotelId)
      if (!hotel) return null
      
      let lowestPrice = Infinity
      let currency = "USD"
      
      if (ratesData.roomTypes) {
        for (const roomType of ratesData.roomTypes) {
          for (const rate of roomType.rates) {
            const totalAmount = rate.retailRate.total[0]?.amount
            const rateCurrency = rate.retailRate.total[0]?.currency
            if (totalAmount !== undefined && totalAmount < lowestPrice) {
              lowestPrice = totalAmount
              currency = rateCurrency || currency
            }
          }
        }
      }

      if (lowestPrice !== Infinity) {
        if (lowestPrice < globalMinPrice) globalMinPrice = lowestPrice
        if (lowestPrice > globalMaxPrice) globalMaxPrice = lowestPrice
      }

      return {
        hotel,
        ratesData,
        lowestPrice: lowestPrice === Infinity ? undefined : lowestPrice,
        currency
      }
    }).filter(Boolean) as ProcessedHotelRate[]

    if (globalMinPrice === Infinity) globalMinPrice = 0
    if (globalMaxPrice === 0) globalMaxPrice = 1000

    // Filter
    processedHotels = processedHotels.filter(h => {
      if (command.priceMin !== undefined || command.priceMax !== undefined) {
        if (h.lowestPrice === undefined) return false
        if (command.priceMin !== undefined && h.lowestPrice < command.priceMin) return false
        if (command.priceMax !== undefined && h.lowestPrice > command.priceMax) return false
      }
      
      if (command.stars && command.stars.length > 0) {
        const hStars = Math.round(h.hotel.starRating || (h.hotel.rating / 2) || 0)
        if (!command.stars.includes(hStars)) return false
      }
      return true
    })

    // Sort
    if (command.sortBy === "price_asc") {
      processedHotels.sort((a, b) => (a.lowestPrice ?? Infinity) - (b.lowestPrice ?? Infinity))
    } else if (command.sortBy === "price_desc") {
      processedHotels.sort((a, b) => (b.lowestPrice ?? 0) - (a.lowestPrice ?? 0))
    }

    const totalCount = processedHotels.length

    // Slice
    const limit = command.limit ?? 10
    const offset = command.offset ?? 0
    const sliced = processedHotels.slice(offset, offset + limit)

    logHotelFlow("fetchHotelRatesAction", "success", { 
      resultCount: sliced.length,
      totalCount
    })
    
    return actionSuccess<PaginatedHotelRatesResponse>({
      hotels: sliced,
      totalCount,
      globalMinPrice: Math.floor(globalMinPrice),
      globalMaxPrice: Math.ceil(globalMaxPrice)
    })
  } catch (error) {
    logHotelFlowError("fetchHotelRatesAction", "failed", error)
    return actionFailure("UPSTREAM_ERROR", "Failed to retrieve hotel rates from supplier.")
  }
}
