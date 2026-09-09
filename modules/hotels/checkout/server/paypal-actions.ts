"use server"

import crypto from "crypto"
import { z } from "zod"
import { resolveActionActorContext } from "@/modules/auth/server"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"
import { fetchCheckoutPageData } from "@/modules/hotels/checkout/server/service"
import { createPayPalOrder, capturePayPalOrder } from "@/lib/paypal"
import { processHotelCheckoutAction } from "./actions"

const createOrderSchema = z.object({
  prebookId: z.string().min(1),
  contactEmail: z.string().email(),
})

export async function createHotelPayPalOrderAction(
  input: unknown
): Promise<ActionResult<{ paypalOrderId: string }>> {
  let actor
  try {
    actor = await resolveActionActorContext({ scope: "hotels.checkout.paypal" })
  } catch (error) {
    return actionFailure("UPSTREAM_ERROR", "Session verification failed.")
  }

  const parsed = createOrderSchema.safeParse(input)
  if (!parsed.success) return actionFailure("VALIDATION_ERROR", "Invalid input")

  const { prebookId, contactEmail } = parsed.data

  try {
    const prebookData = await fetchCheckoutPageData({ prebookId })
    let amount = prebookData.price || 0
    let currency = prebookData.currency || "USD"
    
    if (prebookData.rate?.retailRate?.total?.[0]) {
      amount = prebookData.rate.retailRate.total[0].amount
      currency = prebookData.rate.retailRate.total[0].currency
    }

    if (amount <= 0) {
      return actionFailure("VALIDATION_ERROR", "Cannot process a $0 booking via PayPal.")
    }

    const order = await createPayPalOrder({
      checkoutSessionId: crypto.randomUUID(),
      partialOfferRequestId: prebookId.slice(0, 100), // reusing for description, truncated to fit limit
      quoteId: prebookId,
      offerId: prebookId,
      amount,
      currency,
      contactEmail,
    })

    return actionSuccess({ paypalOrderId: order.id })
  } catch (error) {
    logHotelFlowError("createHotelPayPalOrderAction", "failed", error, { prebookId })
    return actionFailure("UPSTREAM_ERROR", "Failed to initialize PayPal.")
  }
}

const captureOrderSchema = z.object({
  prebookId: z.string().min(1),
  paypalOrderId: z.string().min(1),
  checkoutData: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
  })
})

export async function captureHotelPayPalOrderAction(
  input: unknown
): Promise<ActionResult<{ bookingReference: string }>> {
  let actor
  try {
    actor = await resolveActionActorContext({ scope: "hotels.checkout.paypal" })
  } catch (error) {
    return actionFailure("UPSTREAM_ERROR", "Session verification failed.")
  }

  const parsed = captureOrderSchema.safeParse(input)
  if (!parsed.success) return actionFailure("VALIDATION_ERROR", "Invalid input")

  const { prebookId, paypalOrderId, checkoutData } = parsed.data

  try {
    const capture = await capturePayPalOrder(paypalOrderId)
    
    if (capture.status !== "COMPLETED") {
      return actionFailure("UPSTREAM_ERROR", "PayPal payment was not completed successfully.")
    }

    // Now call processHotelCheckoutAction to actually book it with LiteAPI
    const bookResult = await processHotelCheckoutAction({
      prebookId,
      ...checkoutData,
      paymentMethod: "paypal"
    })

    return bookResult
  } catch (error) {
    logHotelFlowError("captureHotelPayPalOrderAction", "failed", error, { prebookId, paypalOrderId })
    return actionFailure("UPSTREAM_ERROR", "Failed to capture payment or complete booking.")
  }
}
