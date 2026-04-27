import { z } from "zod"

import type { ReviewUrlState } from "@/modules/flights/results/domain/review-types"

const reviewQuerySchema = z.object({
  selected: z.string().min(1),
  fare: z.array(z.string()).optional().default([]),
})

type SearchParamInput = Record<string, string | string[] | undefined>

export function parseReviewUrlState(searchParams: SearchParamInput): ReviewUrlState {
  const selectedRaw = normalizeQueryList(searchParams.selected)
  const fareRaw = normalizeQueryList(searchParams.fare)

  const parsed = reviewQuerySchema.safeParse({
    selected: selectedRaw.join(","),
    fare: fareRaw,
  })

  if (!parsed.success) {
    return {
      selected: [],
      fare: [],
    }
  }

  const result = {
    selected: splitCsv(parsed.data.selected),
    fare: parsed.data.fare.flatMap((value) => splitCsv(value)),
  }

  return result
}

export function toReviewUrlSearchParams(state: ReviewUrlState): URLSearchParams {
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
