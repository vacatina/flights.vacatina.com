import Stripe from "stripe"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-07-29.dahlia",
})

export async function createHotelPaymentIntent(
  amount: number,
  currency: string,
  checkoutSessionId: string
): Promise<ActionResult<{ clientSecret: string }>> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects minor units
      currency: currency.toLowerCase(),
      metadata: {
        hotelCheckoutSessionId: checkoutSessionId,
      },
    })

    if (!paymentIntent.client_secret) {
      return actionFailure("UNKNOWN_ERROR", "Failed to initialize payment")
    }

    return actionSuccess({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.error("Stripe payment intent error:", error)
    return actionFailure("UPSTREAM_ERROR", "Could not connect to payment provider.")
  }
}
