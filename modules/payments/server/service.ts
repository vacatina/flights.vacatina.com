import "server-only"

export function paymentProductAdapterRequired(): never {
  throw new Error(
    "Product-specific payment flows must be implemented through a registered payment adapter."
  )
}
