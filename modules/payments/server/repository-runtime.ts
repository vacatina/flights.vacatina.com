import "server-only"

export function assertPaymentPersistenceAvailable() {
  if (process.env.NODE_ENV === "test") {
    return
  }

  throw new Error("Payment persistence is unavailable.")
}
