"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { lookupBookingAction } from "@/modules/flights/orders/server/actions"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"

export function GuestBookingLookupForm({
  initialReference = "",
}: {
  initialReference?: string
}) {
  const router = useRouter()
  const [reference, setReference] = useState(initialReference)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(() => {
      void (async () => {
        const result = await lookupBookingAction({
          reference,
          email,
        })

        if (!result.ok) {
          setError(
            toSafeUserErrorMessage(
              result.error.message,
              "Booking not found. Please check your reference and email."
            )
          )
          return
        }

        router.push(`/booking/${encodeURIComponent(result.data.bookingReference)}`)
      })()
    })
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Find your booking</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="booking-reference" className="text-sm font-medium">
              Booking reference
            </label>
            <Input
              id="booking-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="BK-XXXXXXXXXX"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="booking-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="booking-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Checking..." : "Find booking"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
