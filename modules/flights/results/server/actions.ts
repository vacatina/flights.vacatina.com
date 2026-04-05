"use server"

import { z } from "zod"

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/modules/flights/search/server/types"
import { fetchFareOptionsData } from "@/modules/flights/results/server/service"
import type { OfferCardViewModel } from "@/modules/flights/results/domain"
import {
  logFlightFlow,
  logFlightFlowError,
} from "@/modules/flights/shared/flow-debug"

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
  logFlightFlow("loadMoreFareOptionsAction", "received_input", {
    inputType: typeof input,
  })
  const parsed = loadMoreFareOptionsSchema.safeParse(input)

  if (!parsed.success) {
    logFlightFlow("loadMoreFareOptionsAction", "validation_failed", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return actionFailure("VALIDATION_ERROR", "Invalid load-more request")
  }

  try {
    logFlightFlow("loadMoreFareOptionsAction", "fetch_started", {
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      leg: parsed.data.state.leg,
      selectedCount: parsed.data.state.selected.length,
      after: parsed.data.state.after,
    })
    const result = await fetchFareOptionsData({
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      state: parsed.data.state,
    })

    logFlightFlow("loadMoreFareOptionsAction", "fetch_succeeded", {
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      offerCount: result.offers.length,
      after: result.after,
    })

    return actionSuccess({
      offers: result.offers,
      after: result.after,
    })
  } catch (error) {
    logFlightFlowError("loadMoreFareOptionsAction", "fetch_failed", error, {
      partialOfferRequestId: parsed.data.partialOfferRequestId,
      leg: parsed.data.state.leg,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      error instanceof Error
        ? error.message
        : "Could not load more offers right now."
    )
  }
}
