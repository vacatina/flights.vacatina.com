import Image from "next/image"
import Link from "next/link"
import { StarIcon, MapPinIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LiteApiHotelInfo, LiteApiRateResponseItem } from "@/modules/hotels/results/server/liteapi-rates"
import { DecimalMoney } from "@/modules/currency/ui"

interface HotelCardProps {
  hotel: LiteApiHotelInfo
  ratesData?: LiteApiRateResponseItem
  lowestPrice?: number
  currency?: string
  searchQuery: string
}

export function HotelCard({ hotel, ratesData, lowestPrice: preCalcPrice, currency: preCalcCurrency, searchQuery }: HotelCardProps) {
  // Find the cheapest rate among all rooms and rates
  let lowestPrice = preCalcPrice !== undefined ? preCalcPrice : Infinity
  let currency = preCalcCurrency || "USD"
  let hasRates = preCalcPrice !== undefined

  if (ratesData && ratesData.roomTypes && preCalcPrice === undefined) {
    for (const roomType of ratesData.roomTypes) {
      for (const rate of roomType.rates) {
        const totalAmount = rate.retailRate.total[0]?.amount
        const rateCurrency = rate.retailRate.total[0]?.currency
        if (totalAmount !== undefined && totalAmount < lowestPrice) {
          lowestPrice = totalAmount
          currency = rateCurrency || currency
          hasRates = true
        }
      }
    }
  }

  // A helper to generate star elements based on rating
  // Rating is out of 10, starRating is out of 5.
  const computedStars = hotel.starRating || (hotel.rating ? hotel.rating / 2 : 0)
  const stars = Math.min(5, Math.max(0, Math.round(computedStars)))

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border sm:flex-row">
      <div className="relative h-48 w-full shrink-0 sm:h-auto sm:w-72 bg-muted">
        {hotel.main_photo && (
          <Image
            src={hotel.main_photo}
            alt={hotel.name}
            fill
            className="object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1 text-yellow-500">
              {Array.from({ length: stars }).map((_, i) => (
                <StarIcon key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              {hotel.name}
            </h2>
            <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="line-clamp-2">{hotel.address}</span>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            {hasRates ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">from</p>
                <p className="text-2xl font-bold text-foreground">
                  <DecimalMoney value={lowestPrice} currency={currency} />
                </p>
                <p className="text-xs text-muted-foreground">per night / total</p>
              </>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                No rates available
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto pt-6 flex items-end justify-between">
          <div className="flex flex-wrap gap-2">
            {hotel.tags?.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          
          {hasRates ? (
            <Button render={<Link href={`/hotels/results/${hotel.id}?${searchQuery}`} />}>
              View Rooms
            </Button>
          ) : (
            <Button disabled>
              View Rooms
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
