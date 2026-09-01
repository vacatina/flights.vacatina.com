"use client"

import { useState, useCallback, useTransition, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"
import type { PaginatedHotelRatesResponse } from "@/modules/hotels/results/server/actions"
import { HotelCard } from "@/modules/hotels/results/ui/hotel-card"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DecimalMoney } from "@/modules/currency/ui"
import { useCurrency } from "@/modules/currency/ui/currency-provider"
import { HotelCardSkeleton } from "@/modules/hotels/results/ui/hotel-results-skeleton"

interface HotelResultsClientProps {
  response: PaginatedHotelRatesResponse
  command: HotelSearchCommand
}

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
  const sortBy = (command.sortBy as SortOption) || "top_picks"

  const { hotels, totalCount, globalMinPrice, globalMaxPrice } = response

  // Local state for filters to allow optimistic UI while dragging/clicking
  const [priceRange, setPriceRange] = useState<[number, number]>([
    command.priceMin ?? globalMinPrice, 
    command.priceMax ?? globalMaxPrice
  ])
  
  // Sync state if URL changes from outside (e.g. back button)
  useEffect(() => {
    setPriceRange([
      command.priceMin ?? globalMinPrice, 
      command.priceMax ?? globalMaxPrice
    ])
  }, [command.priceMin, command.priceMax, globalMinPrice, globalMaxPrice])

  const updateFilters = useCallback((newOffset: number, newSort: string, pMin: number, pMax: number, stars: number[]) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("offset", newOffset.toString())
      params.set("limit", limit.toString())
      params.set("sortBy", newSort)
      
      if (pMin > globalMinPrice) params.set("priceMin", pMin.toString())
      else params.delete("priceMin")
        
      if (pMax < globalMaxPrice) params.set("priceMax", pMax.toString())
      else params.delete("priceMax")
        
      if (stars.length > 0) params.set("stars", stars.join(","))
      else params.delete("stars")
        
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [searchParams, pathname, router, limit, globalMinPrice, globalMaxPrice])

  const handleNextPage = () => {
    if (offset + limit < totalCount) {
      updateFilters(offset + limit, sortBy, priceRange[0], priceRange[1], command.stars ?? [])
    }
  }

  const handlePrevPage = () => {
    if (offset > 0) {
      updateFilters(Math.max(0, offset - limit), sortBy, priceRange[0], priceRange[1], command.stars ?? [])
    }
  }

  function toggleStarFilter(star: number) {
    const currentStars = command.stars ?? []
    const newStars = currentStars.includes(star)
      ? currentStars.filter(s => s !== star)
      : [...currentStars, star]
      
    // Reset to page 1 on filter change
    updateFilters(0, sortBy, priceRange[0], priceRange[1], newStars)
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
                }} 
                onValueCommitted={(val: any) => {
                  // Reset to page 1 on filter change
                  updateFilters(0, sortBy, val[0], val[1], command.stars ?? [])
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
                {[5, 4, 3, 2, 1].map(star => {
                  const currentStars = command.stars ?? []
                  return (
                    <label key={star} className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-input text-primary"
                        checked={currentStars.includes(star)}
                        onChange={() => toggleStarFilter(star)}
                      />
                      {star} Stars
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Results */}
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Showing {hotels.length === 0 ? 0 : offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount} properties
          </p>

          <Select value={sortBy} onValueChange={(val: any) => updateFilters(0, val as SortOption, priceRange[0], priceRange[1], command.stars ?? [])}>
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

        {hotels.length === 0 ? (
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
              hotels.map(({ hotel, ratesData, lowestPrice, currency }) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  ratesData={ratesData}
                  lowestPrice={lowestPrice}
                  currency={currency}
                  searchQuery={searchParams.toString()}
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
                  onClick={(e) => { e.preventDefault(); handleNextPage() }}
                  className={offset + limit >= totalCount ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
