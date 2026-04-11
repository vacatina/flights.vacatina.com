import { z } from "zod"

import type { ReviewUrlState } from "@/modules/flights/results/domain/review-types"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

const reviewQuerySchema = z.object({
  selected: z.string().min(1),
  fare: z.array(z.string()).optional().default([]),
})

type SearchParamInput = Record<string, string | string[] | undefined>

export function parseReviewUrlState(searchParams: SearchParamInput): ReviewUrlState {
  logFlightFlow("parseReviewUrlState", "received_search_params", {
    keys: Object.keys(searchParams),
  })
  const selectedRaw = normalizeQueryList(searchParams.selected)
  const fareRaw = normalizeQueryList(searchParams.fare)

  const parsed = reviewQuerySchema.safeParse({
    selected: selectedRaw.join(","),
    fare: fareRaw,
  })

  if (!parsed.success) {
    logFlightFlow("parseReviewUrlState", "parse_failed_using_empty_state", {
      issueCount: parsed.error.issues.length,
      firstIssue: parsed.error.issues[0]?.message,
    })
    return {
      selected: [],
      fare: [],
    }
  }

  const result = {
    selected: splitCsv(parsed.data.selected),
    fare: parsed.data.fare.flatMap((value) => splitCsv(value)),
  }

  logFlightFlow("parseReviewUrlState", "parse_succeeded", {
    selectedCount: result.selected.length,
    fareCount: result.fare.length,
  })

  return result
}

export function toReviewUrlSearchParams(state: ReviewUrlState): URLSearchParams {
  logFlightFlow("toReviewUrlSearchParams", "serializing_state", {
    selectedCount: state.selected.length,
    fareCount: state.fare.length,
  })
  const params = new URLSearchParams()

  if (state.selected.length > 0) {
    params.set("selected", state.selected.join(","))
  }

  for (const fareKey of state.fare) {
    if (!fareKey.trim()) {
      continue
    }

    params.append("fare", fareKey)
  }

  logFlightFlow("toReviewUrlSearchParams", "serialized_state", {
    paramCount: Array.from(params.keys()).length,
    hasSelected: params.has("selected"),
    fareParamCount: params.getAll("fare").length,
  })
  return params
}

function normalizeQueryList(value: string | string[] | undefined): string[] {
  if (!value) {
    return []
  }

  const values = Array.isArray(value) ? value : [value]

  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
