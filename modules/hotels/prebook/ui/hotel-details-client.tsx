"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { InfoIcon, Loader2Icon, MapPinIcon, StarIcon } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DecimalMoney } from "@/modules/currency/ui"

import type { LiteApiHotelInfo, LiteApiRateResponseItem } from "@/modules/hotels/results/server/liteapi-rates"

import { prebookHotelAction } from "@/modules/hotels/prebook/server/actions"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"

interface HotelDetailsClientProps {
  hotel: LiteApiHotelInfo
  ratesData: LiteApiRateResponseItem
  summary: {
    destinationName: string
    checkin: string
    checkout: string
    guestsCount: number
    roomsCount: number
  }
  searchParams: Record<string, string>
}

export function HotelDetailsClient({ hotel, ratesData, summary, searchParams }: HotelDetailsClientProps) {
  const router = useRouter()
  const [isPrebooking, startPrebooking] = useTransition()
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [prebookError, setPrebookError] = useState<string | null>(null)

  const computedStars = hotel.starRating || (hotel.rating ? hotel.rating / 2 : 0)
  const stars = Math.min(5, Math.max(0, Math.round(computedStars)))

  const handlePrebook = (offerId: string, uiRateId: string) => {
    setSelectedRateId(uiRateId)
    setPrebookError(null)

    startPrebooking(() => {
      void (async () => {
        const result = await prebookHotelAction({ offerId })

        if (!result.ok) {
          setPrebookError(
            toSafeUserErrorMessage(
              result.error.message,
              "Unable to start checkout right now. Please try again."
            )
          )
          return
        }

        const params = new URLSearchParams(searchParams)
        router.push(`/hotels/checkout/${result.data.prebookId}?${params.toString()}`)
      })()
    })
  }

  const searchParamsString = new URLSearchParams(searchParams).toString()

  return (
    <main className="min-h-svh bg-muted/40 py-7 md:py-10">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-7 px-4 md:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/hotels/results?${searchParamsString}`} />}>
                Hotels in {summary.destinationName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{hotel.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Hotel Header */}
        <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border sm:flex-row">
          <div className="relative h-64 w-full shrink-0 sm:h-auto sm:w-1/3 bg-muted">
            {hotel.main_photo && (
              <Image
                src={hotel.main_photo}
                alt={hotel.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          
          <div className="flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-1 text-yellow-500 mb-2">
              {Array.from({ length: stars }).map((_, i) => (
                <StarIcon key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {hotel.name}
            </h1>
            <div className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{hotel.address}</span>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {hotel.tags?.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Search Summary */}
        <Card className="rounded-2xl border bg-card shadow-none">
          <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Stay Details</p>
              <p className="text-lg font-semibold mt-1">
                {new Date(summary.checkin).toLocaleDateString()} &mdash; {new Date(summary.checkout).toLocaleDateString()}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Guests & Rooms</p>
              <p className="text-lg font-semibold mt-1">
                {summary.guestsCount} Guest{summary.guestsCount > 1 ? "s" : ""} &bull; {summary.roomsCount} Room{summary.roomsCount > 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        {prebookError && (
          <div className="rounded-xl bg-destructive/10 p-4 text-destructive ring-1 ring-destructive/20">
            {prebookError}
          </div>
        )}

        {/* Room Types & Rates */}
        <div className="space-y-8">
          <h2 className="text-xl font-bold md:text-2xl">Available Rooms</h2>
          
          <div className="grid gap-6">
            {ratesData.roomTypes?.map((roomType, rIdx) => (
              <Card key={`room-${rIdx}`} className="overflow-hidden rounded-2xl shadow-none">
                <CardHeader className="bg-muted/30 pb-4">
                  <CardTitle className="text-lg">
                    {roomType.rates[0]?.name || "Standard Room"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {roomType.rates.map((rate) => {
                      const amount = rate.retailRate.total[0]?.amount
                      const currency = rate.retailRate.total[0]?.currency || "USD"
                      const isPending = isPrebooking && selectedRateId === rate.rateId

                      return (
                        <div key={rate.rateId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 md:p-6 transition-colors hover:bg-muted/20">
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {rate.boardName || "Standard Rate"}
                            </p>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <InfoIcon className="h-4 w-4" />
                              <span>{rate.cancellationPolicies?.cancelPolicyInfos?.length ? "Cancellation policy applies" : "Non-refundable"}</span>
                            </div>
                          </div>
                          
                          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Total price</p>
                              <p className="text-2xl font-bold">
                                {amount !== undefined ? (
                                  <DecimalMoney value={amount} currency={currency} />
                                ) : (
                                  "N/A"
                                )}
                              </p>
                            </div>
                            <Button 
                              size="lg" 
                              onClick={() => handlePrebook(roomType.offerId, rate.rateId || "")}
                              disabled={isPrebooking || amount === undefined}
                              className="min-w-[120px]"
                            >
                              {isPending ? (
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                              ) : (
                                "Select"
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
