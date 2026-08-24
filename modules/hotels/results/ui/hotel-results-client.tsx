"use client"

import { useMemo, useState, useCallback, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import type { LiteApiRatesSearchResponse, LiteApiHotelInfo, LiteApiRateResponseItem } from "@/modules/hotels/results/server/liteapi-rates"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"
import { HotelCard } from "@/modules/hotels/results/ui/hotel-card"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DecimalMoney } from "@/modules/currency/ui"
import { useCurrency } from "@/modules/currency/ui/currency-provider"
import { HotelCardSkeleton } from "@/modules/hotels/results/ui/hotel-results-skeleton"

interface HotelResultsClientProps {
  response: LiteApiRatesSearchResponse
  command: HotelSearchCommand
}

const PAGE_SIZE = 10

type SortOption = "top_picks" | "price_asc" | "price_desc"

const SORT_LABELS: Record<SortOption, string> = {
  top_picks: "Our Top Picks",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low"
}

export function HotelResultsClient({ response, command }: HotelResultsClientProps) {
  const { selectedCurrency } = useCurrency()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const limit = command.limit ?? 10
  const offset = command.offset ?? 0
  const currentPage = Math.floor(offset / limit) + 1

  // 1. Data Pre-processing: Attach lowest price to each hotel
  const processedHotels = useMemo(() => {
    const dataList = response.data || []
    const hotelsMap = new Map((response.hotels || []).map(h => [h.id, h]))
    
    return dataList.map((ratesData) => {
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
      return {
        ...hotel,
        lowestPrice: lowestPrice === Infinity ? undefined : lowestPrice,
        currency,
        ratesData
      }
    }).filter(Boolean) as (LiteApiHotelInfo & {
      lowestPrice?: number
      currency: string
      ratesData: LiteApiRateResponseItem
    })[]
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

  // Sort State is now derived from URL
  const sortBy = (command.sortBy as SortOption) || "top_picks"
  
  // Pagination State is now derived from URL

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

    return result
  }, [processedHotels, priceRange, selectedStars])

  // 3. Pagination Logic
  const paginatedHotels = filteredAndSorted
  const hasNextPage = (response.data?.length ?? 0) >= limit

  const updatePage = useCallback((newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      const newOffset = (newPage - 1) * limit
      params.set("offset", newOffset.toString())
      params.set("limit", limit.toString())
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [searchParams, pathname, router, limit])

  const handleNextPage = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("offset", (offset + limit).toString())
      params.set("limit", limit.toString())
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [searchParams, pathname, router, limit, offset])

  const handlePrevPage = useCallback(() => {
    if (offset === 0) return
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      const newOffset = Math.max(0, offset - limit)
      params.set("offset", newOffset.toString())
      params.set("limit", limit.toString())
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [searchParams, pathname, router, limit, offset])

  const updateSort = useCallback((newSort: SortOption) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("sortBy", newSort)
      params.set("offset", "0") // Reset to page 1 on sort change
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [searchParams, pathname, router])

  function toggleStarFilter(star: number) {
    setSelectedStars(prev => {
      if (prev.includes(star)) {
        return prev.filter(s => s !== star)
      }
      return [...prev, star]
    })
    updatePage(1)
  }

  return (
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
                      updatePage(1)
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

                {/* Star Rating Checkboxes
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
                */}
              </div>

            </div>
          </div>

          {/* Main Results */}
          <div className="flex w-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Showing {paginatedHotels.length === 0 ? 0 : offset + 1} to {offset + paginatedHotels.length} properties
              </p>

              <Select value={sortBy} onValueChange={(val: any) => updateSort(val as SortOption)}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Sort by">
                    {SORT_LABELS[sortBy]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top_picks">Our Top Picks</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
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
                {isPending ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <HotelCardSkeleton key={i} />
                  ))
                ) : (
                  paginatedHotels.map((hotel) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      ratesData={hotel.ratesData}
                      lowestPrice={hotel.lowestPrice}
                      currency={hotel.currency}
                    />
                  ))
                )}
              </div>
            )}

            {/* Pagination Controls */}
            <div className="mt-6 flex justify-center pb-8">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handlePrevPage() }}
                      className={offset === 0 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-4 text-sm font-medium text-foreground">Page {currentPage}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (hasNextPage) handleNextPage() }}
                      className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
    </div>
  )
}
