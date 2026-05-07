import type Stripe from "stripe"

export function isStripeCheckoutSession(
  value: Stripe.Event.Data.Object | null | undefined
): value is Stripe.Checkout.Session {
  if (!value || typeof value !== "object" || !("object" in value)) {
    return false
  }

  return value.object === "checkout.session"
}
