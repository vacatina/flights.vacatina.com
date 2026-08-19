"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import type { LiteApiRatesSearchResponse, LiteApiHotelInfo } from "@/modules/hotels/results/server/liteapi-rates"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"
import { HotelCard } from "@/modules/hotels/results/ui/hotel-card"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DecimalMoney } from "@/modules/currency/ui"
import { useCurrency } from "@/modules/currency/ui/currency-provider"

interface HotelResultsClientProps {
  response: LiteApiRatesSearchResponse
  command: HotelSearchCommand
  destinationName?: string
}

const PAGE_SIZE = 10

type SortOption = "recommended" | "price_asc" | "price_desc" | "rating_desc"

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  rating_desc: "Rating: High to Low"
}

export function HotelResultsClient({ response, command, destinationName = "Destination" }: HotelResultsClientProps) {
  const { selectedCurrency } = useCurrency()

  const checkinDate = new Date(command.checkin)
  const checkoutDate = new Date(command.checkout)
  const guestsCount = command.occupancies.reduce(
    (acc, occ) => acc + occ.adults + (occ.children?.length ?? 0),
    0
  )

  // 1. Data Pre-processing: Attach lowest price to each hotel
  const processedHotels = useMemo(() => {
    const hotels = response.hotels || []
    return hotels.map((hotel) => {
      let lowestPrice = Infinity
      let currency = "USD"
      
      const ratesData = response.data.find((d) => d.hotelId === hotel.id)
      if (ratesData && ratesData.roomTypes) {
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
      return {
        ...hotel,
        lowestPrice: lowestPrice === Infinity ? undefined : lowestPrice,
        currency,
        ratesData
      }
    })
  }, [response])

  // Get max and min price boundaries from data
  const { globalMinPrice, globalMaxPrice } = useMemo(() => {
    let min = Infinity
    let max = 0
    for (const h of processedHotels) {
      if (h.lowestPrice !== undefined) {
        if (h.lowestPrice < min) min = h.lowestPrice
        if (h.lowestPrice > max) max = h.lowestPrice
      }
    }
    return {
      globalMinPrice: min === Infinity ? 0 : Math.floor(min),
      globalMaxPrice: max === 0 ? 1000 : Math.ceil(max)
    }
  }, [processedHotels])

  // Filter State
  const [priceRange, setPriceRange] = useState<[number, number]>([globalMinPrice, globalMaxPrice])
  const [selectedStars, setSelectedStars] = useState<number[]>([])
  
  // Sort State
  const [sortBy, setSortBy] = useState<SortOption>("recommended")
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)

  // 2. Filter & Sort Logic
  const filteredAndSorted = useMemo(() => {
    let result = processedHotels.filter(h => {
      // Filter by price
      if (h.lowestPrice !== undefined) {
        if (h.lowestPrice < priceRange[0] || h.lowestPrice > priceRange[1]) {
          return false
        }
      }
      
      // Filter by stars
      if (selectedStars.length > 0) {
        // Fallback to dividing rating by 2 if starRating is missing
        const hStars = Math.round(h.starRating || (h.rating / 2) || 0)
        if (!selectedStars.includes(hStars)) {
          return false
        }
      }
      
      return true
    })

    // Sort
    result.sort((a, b) => {
      if (sortBy === "price_asc") {
        return (a.lowestPrice ?? Infinity) - (b.lowestPrice ?? Infinity)
      }
      if (sortBy === "price_desc") {
        return (b.lowestPrice ?? -1) - (a.lowestPrice ?? -1)
      }
      if (sortBy === "rating_desc") {
        return (b.rating ?? 0) - (a.rating ?? 0)
      }
      return 0 // recommended (preserve original order)
    })

    return result
  }, [processedHotels, priceRange, selectedStars, sortBy])

  // 3. Pagination Logic
  const totalItems = filteredAndSorted.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)
  const paginatedHotels = filteredAndSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function toggleStarFilter(star: number) {
    setSelectedStars(prev => {
      if (prev.includes(star)) {
        return prev.filter(s => s !== star)
      }
      return [...prev, star]
    })
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 pt-8">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        {/* Header Summary */}
        <div className="mb-8 flex flex-col gap-2 rounded-xl bg-white p-6 shadow-sm ring-1 ring-border">
          <h1 className="text-2xl font-semibold text-foreground">
            Hotels in {destinationName}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            {format(checkinDate, "MMM d")} - {format(checkoutDate, "MMM d")} • {guestsCount} guest{guestsCount !== 1 ? "s" : ""} • {command.occupancies.length} room{command.occupancies.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col items-start gap-8 lg:flex-row">
          {/* Sidebar Filters */}
          <div className="w-full shrink-0 flex-col gap-6 lg:flex lg:w-72">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border">
              <h3 className="mb-5 font-semibold text-foreground">Filter by</h3>
              
              <div className="space-y-6">
                {/* Price Slider */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Price Range ({selectedCurrency})</Label>
                  <Slider 
                    min={globalMinPrice} 
                    max={globalMaxPrice} 
                    step={10} 
                    value={priceRange} 
                    onValueChange={(val: any) => {
                      setPriceRange([val[0], val[1]])
                      setCurrentPage(1)
                    }} 
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      <DecimalMoney value={priceRange[0]} currency="USD" />
                    </span>
                    <span>
                      <DecimalMoney value={priceRange[1]} currency="USD" />
                    </span>
                  </div>
                </div>

                <hr className="border-border" />

                {/* Star Rating Checkboxes */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Star Rating</Label>
                  <div className="flex flex-col gap-2">
                    {[5, 4, 3, 2, 1].map(star => (
                      <label key={star} className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-input text-primary"
                          checked={selectedStars.includes(star)}
                          onChange={() => toggleStarFilter(star)}
                        />
                        {star} Stars
                      </label>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Main Results */}
          <div className="flex w-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Showing {totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} properties
              </p>

              <Select value={sortBy} onValueChange={(val: any) => { setSortBy(val as SortOption); setCurrentPage(1) }}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Sort by">
                    {SORT_LABELS[sortBy]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating_desc">Rating: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paginatedHotels.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-border">
                <h3 className="mb-2 text-lg font-semibold">No hotels found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {paginatedHotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    ratesData={hotel.ratesData}
                    lowestPrice={hotel.lowestPrice}
                    currency={hotel.currency}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center pb-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)) }}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink 
                          href="#" 
                          isActive={currentPage === i + 1}
                          onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1) }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)) }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
