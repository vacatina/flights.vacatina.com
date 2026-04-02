import "server-only"

import { Duffel } from "@duffel/api"

let duffelClient: Duffel | null = null

export function getDuffelClient() {
  const token = process.env.DUFFEL_ACCESS_TOKEN

  if (!token) {
    throw new Error("Missing DUFFEL_ACCESS_TOKEN environment variable")
  }

  if (!duffelClient) {
    duffelClient = new Duffel({ token })
  }

  return duffelClient
}
