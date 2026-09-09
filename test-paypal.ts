import { createPayPalOrder } from "./modules/payments/server/providers/paypal/client"
import crypto from "crypto"

async function test() {
  try {
    const order = await createPayPalOrder({
      checkoutSessionId: crypto.randomUUID(),
      partialOfferRequestId: "123",
      quoteId: "123",
      offerId: "123",
      amount: 150,
      currency: "USD",
      contactEmail: "test@example.com"
    })
    console.log("Success:", order.id)
  } catch (error: any) {
    console.log("Error:", error.message)
  }
}

test()
