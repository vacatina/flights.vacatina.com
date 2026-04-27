import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

type PageActorType = "guest" | "user"

export function logFlowPageRequest(input: {
  scope: string
  partialOfferRequestId: string
  searchParamKeys: string[]
  actorType: PageActorType
}) {
  logFlightFlow(input.scope, "request_received", {
    partialOfferRequestId: input.partialOfferRequestId,
    searchParamKeys: input.searchParamKeys,
    actorType: input.actorType,
  })
}

export function logFlowPageFailure(input: {
  scope: string
  step: string
  error: unknown
  metadata: Record<string, unknown>
}) {
  logFlightFlowError(input.scope, input.step, input.error, input.metadata)
}

