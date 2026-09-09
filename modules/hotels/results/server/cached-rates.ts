import { cacheLife, cacheTag } from "next/cache"
import { searchLiteApiRates } from "@/modules/hotels/results/server/liteapi-rates"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"
import type { LiteApiRatesSearchResponse } from "@/modules/hotels/results/server/liteapi-rates"

export async function getCachedLiteApiRates(
  command: HotelSearchCommand
): Promise<LiteApiRatesSearchResponse> {
  "use cache"
  cacheLife("minutes")
  
  // We include key command parts in the cache tag so we could invalidate if needed
  cacheTag(`hotel-rates-${command.placeId}-${command.checkin}-${command.checkout}`)

  // Override limit, offset, and sort to get a large chunk of default top picks
  const cachedCommand: HotelSearchCommand = {
    ...command,
    limit: 300,
    offset: 0,
    sortBy: "top_picks"
  }

  return searchLiteApiRates(cachedCommand)
}
