"use client"

import { useState, useTransition } from "react"
import { CheckCircle2Icon, MapPinIcon, CalendarIcon, DownloadIcon, Loader2Icon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { LiteApiBookingData } from "@/modules/hotels/orders/server/service"
import { DecimalMoney } from "@/modules/currency/ui"
import { generateHotelVoucherAction } from "@/modules/hotels/orders/server/actions"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"

interface HotelBookingClientProps {
  data: LiteApiBookingData
  clerkEnabled: boolean
}

export function HotelBookingClient({ data, clerkEnabled }: HotelBookingClientProps) {
  const [isDownloading, startDownloading] = useTransition()
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Try to extract relevant fields or fallback to placeholders since LiteAPI payloads vary
  const hotelName = data.hotel?.name || "Confirmed Hotel"
  const checkin = data.checkin || "N/A"
  const checkout = data.checkout || "N/A"
  
  let amount = data.price || 0
  let currency = data.currency || "USD"

  if (data.rate?.retailRate?.total?.[0]) {
    amount = data.rate.retailRate.total[0].amount
    currency = data.rate.retailRate.total[0].currency
  }

  const handleDownloadVoucher = () => {
    setDownloadError(null)
    startDownloading(() => {
      void (async () => {
        const result = await generateHotelVoucherAction({
          bookingReference: data.bookingId
        })

        if (!result.ok) {
          setDownloadError(
            toSafeUserErrorMessage(
              result.error.message,
              "Unable to generate voucher right now. Please try again."
            )
          )
          return
        }

        // Open the simulated PDF URL in a new tab
        window.open(result.data.voucherUrl, "_blank")
      })()
    })
  }

  return (
    <main className="min-h-svh bg-muted/30 py-8 text-foreground md:py-12">
      <div className="mx-auto w-full max-w-3xl px-4 md:px-8">
        
        {/* Success Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
          <div className="rounded-full bg-emerald-100 p-3 ring-8 ring-emerald-50">
            <CheckCircle2Icon className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-900 md:text-4xl">
            Booking Confirmed!
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Your reservation at {hotelName} is confirmed. A confirmation email has been sent.
          </p>
        </div>

        <div className="space-y-6">
          {/* Booking Summary Card */}
          <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="bg-primary/5 p-4 md:p-6 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
                    Booking Reference
                  </p>
                  <p className="text-2xl font-bold font-mono mt-1">{data.bookingId}</p>
                </div>
                <div className="flex gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors">
                    {data.status || "CONFIRMED"}
                  </span>
                </div>
              </div>
            </div>
            
            <CardContent className="p-4 md:p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">{hotelName}</h3>
                
                <div className="grid gap-6 sm:grid-cols-2 bg-muted/20 p-4 rounded-xl border border-border/50">
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Check-in</p>
                      <p className="font-semibold">{checkin}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Check-out</p>
                      <p className="font-semibold">{checkout}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold">
                    {amount > 0 ? (
                      <DecimalMoney value={amount} currency={currency} />
                    ) : (
                      "Total Secured"
                    )}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <Button 
                    onClick={handleDownloadVoucher} 
                    size="lg" 
                    variant="outline" 
                    className="rounded-xl"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <DownloadIcon className="mr-2 h-4 w-4" />
                    )}
                    Download Voucher
                  </Button>
                  {downloadError && (
                    <p className="text-sm text-destructive mt-1">{downloadError}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
