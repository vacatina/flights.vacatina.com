"use server"

import { z } from "zod"

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/modules/flights/search/server/types"
import { fetchFareOptionsData } from "@/modules/flights/results/server/service"
import type { OfferCardViewModel } from "@/modules/flights/results/domain"

const loadMoreFareOptionsSchema = z.object({
  partialOfferRequestId: z.string().min(1),
  state: z.object({
    leg: z.number().int().min(0),
    selected: z.array(z.string()),
    sort: z.enum([
      "least_expensive",
      "most_expensive",
      "shortest_duration",
      "longest_duration",
    ]),
    stops: z.enum(["direct", "max_1", "max_2", "any"]),
    airline: z.string().optional(),
    flightNumber: z.string().optional(),
    takeoffFrom: z.number().int().min(0).max(1439),
    takeoffTo: z.number().int().min(0).max(1439),
    landingFrom: z.number().int().min(0).max(1439),
    landingTo: z.number().int().min(0).max(1439),
    after: z.string().optional(),
  }),
})

export async function loadMoreFareOptionsAction(
  input: unknown
): Promise<ActionResult<{ offers: OfferCardViewModel[]; after: string | null }>> {
  const parsed = loadMoreFareOptionsSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure("VALIDATION_ERROR", "Invalid load-more request")
  }

  try {
    const result = await fetchFareOptionsData({
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      state: parsed.data.state,
    })

    return actionSuccess({
      offers: result.offers,
      after: result.after,
    })
  } catch (error) {
    return actionFailure(
      "UPSTREAM_ERROR",
      error instanceof Error
        ? error.message
        : "Could not load more offers right now."
    )
  }
}
