"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DecimalMoney } from "@/modules/currency/ui"

import type { LiteApiPrebookData } from "@/modules/hotels/checkout/server/service"
import { createHotelPayPalOrderAction, captureHotelPayPalOrderAction } from "@/modules/hotels/checkout/server/paypal-actions"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"
import { HotelPayPalCheckout } from "./hotel-paypal"

const hotelCheckoutSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number is required"),
  paymentMethod: z.enum(["card", "paypal"]),
})

type HotelCheckoutValues = z.infer<typeof hotelCheckoutSchema>

interface HotelCheckoutClientProps {
  data: LiteApiPrebookData
}

export function HotelCheckoutClient({ data }: HotelCheckoutClientProps) {
  const router = useRouter()
  const [isSubmitting, startSubmitting] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<HotelCheckoutValues>({
    resolver: zodResolver(hotelCheckoutSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      paymentMethod: "card",
    },
  })

  const handleCreatePayPalOrder = async () => {
    setSubmitError(null)
    const valid = await form.trigger()
    if (!valid) throw new Error("Form is invalid")

    const values = form.getValues()
    const result = await createHotelPayPalOrderAction({
      prebookId: data.prebookId,
      contactEmail: values.email
    })

    if (!result.ok) {
      setSubmitError(result.error.message)
      throw new Error(result.error.message)
    }

    return result.data.paypalOrderId
  }

  const handleCapturePayPalOrder = async (paypalOrderId: string) => {
    setSubmitError(null)
    startSubmitting(() => {
      void (async () => {
        const values = form.getValues()
        const result = await captureHotelPayPalOrderAction({
          prebookId: data.prebookId,
          paypalOrderId,
          checkoutData: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
          }
        })

        if (!result.ok) {
          setSubmitError(
            toSafeUserErrorMessage(
              result.error.message,
              "Unable to complete payment right now. Please try again."
            )
          )
          return
        }

        router.push(`/hotels/booking/${result.data.bookingReference}`)
      })()
    })
  }

  // Fallback to extract price from prebook data if it's deeply nested
  // This is a rough estimation since LiteAPI structures might vary
  let amount = data.price || 0
  let currency = data.currency || "USD"
  
  if (data.rate?.retailRate?.total?.[0]) {
    amount = data.rate.retailRate.total[0].amount
    currency = data.rate.retailRate.total[0].currency
  }

  return (
    <main className="min-h-svh bg-muted/40 py-8 text-foreground md:py-12">
      <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Secure Checkout</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete your booking in just a few steps.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            <form id="hotel-checkout-form" className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              
              {/* Primary Guest Details */}
              <Card className="rounded-2xl border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-xl">Primary Guest Details</CardTitle>
                  <CardDescription>Enter the details of the person checking in.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        {...form.register("firstName")}
                        className={form.formState.errors.firstName ? "border-destructive" : ""}
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        {...form.register("lastName")}
                        className={form.formState.errors.lastName ? "border-destructive" : ""}
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@example.com"
                        {...form.register("email")}
                        className={form.formState.errors.email ? "border-destructive" : ""}
                      />
                      {form.formState.errors.email && (
                        <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        {...form.register("phone")}
                        className={form.formState.errors.phone ? "border-destructive" : ""}
                      />
                      {form.formState.errors.phone && (
                        <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details */}
              <Card className="rounded-2xl border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-xl">Payment</CardTitle>
                  <CardDescription>All transactions are secure and encrypted.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!form.formState.isValid && (
                     <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                       Complete the guest details above to enable payment.
                     </p>
                  )}
                  {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
                    <HotelPayPalCheckout
                      clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}
                      amount={amount}
                      currency={currency}
                      disabled={!form.formState.isValid || isSubmitting}
                      onCreatePayPalOrder={handleCreatePayPalOrder}
                      onCapturePayPalOrder={handleCapturePayPalOrder}
                      onPayPalCancel={() => setSubmitError("Payment was cancelled.")}
                      onPayPalError={() =>
                        setSubmitError("A payment error occurred.")
                      }
                    />
                  ) : (
                    <p className="text-sm text-destructive">PayPal Client ID is missing</p>
                  )}
                </CardContent>
              </Card>

              {submitError && (
                <div className="rounded-xl bg-destructive/10 p-4 text-destructive ring-1 ring-destructive/20 text-sm">
                  {submitError}
                </div>
              )}
            </form>
          </div>

          {/* Checkout Summary Rail */}
          <aside className="lg:sticky lg:top-6">
            <Card className="rounded-2xl bg-card shadow-none">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Prebook Session</p>
                  <p className="font-mono text-xs truncate" title={data.prebookId}>{data.prebookId}</p>
                </div>
                
                <div className="space-y-1 pt-4 border-t border-border/50">
                  <p className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Total Due</p>
                  <p className="text-3xl font-bold tracking-tight">
                    {amount > 0 ? (
                      <DecimalMoney value={amount} currency={currency} />
                    ) : (
                      "TBD"
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  )
}
