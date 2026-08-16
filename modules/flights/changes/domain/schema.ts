import { z } from "zod"
import { flightChangeRequestTypes } from "@/modules/flights/changes/domain/types"

const idList = z.array(z.string().trim().min(1)).max(20).default([])
export const createFlightChangeRequestSchema = z.object({
  bookingReference: z.string().trim().min(4).max(64),
  requestType: z.enum(flightChangeRequestTypes),
  customerReason: z.string().trim().min(5).max(2000),
  selectedPassengerIds: idList,
  selectedSliceIds: idList,
  requestedChange: z.record(z.string(), z.unknown()).nullish(),
}).superRefine((value, ctx) => {
  if (value.requestType === "remove_passenger" && value.selectedPassengerIds.length === 0) ctx.addIssue({ code: "custom", path: ["selectedPassengerIds"], message: "Select at least one traveller." })
  if (value.requestType === "itinerary_change" && value.selectedSliceIds.length === 0) ctx.addIssue({ code: "custom", path: ["selectedSliceIds"], message: "Select at least one journey." })
})

export const flightChangeSearchSchema = z.object({
  bookingReference: z.string().trim().min(4), selectedSliceIds: z.array(z.string().trim().min(1)).min(1),
  criteria: z.array(z.object({ origin: z.string().trim().length(3).transform(v => v.toUpperCase()), destination: z.string().trim().length(3).transform(v => v.toUpperCase()), departureDate: z.iso.date(), cabinClass: z.enum(["first","business","premium_economy","economy"]) })).min(1),
})

export const adminChangeActionSchema = z.object({ requestId: z.string().trim().min(1), action: z.enum(["approve","reject","manual","complete","update"]), reason: z.string().trim().max(2000).optional(), externalReference: z.string().trim().max(200).optional(), customerMessage: z.string().trim().max(2000).optional() }).superRefine((v,ctx)=>{ if(v.action === "reject" && !v.reason) ctx.addIssue({code:"custom",path:["reason"],message:"A rejection reason is required."}); if(v.action === "update" && !v.customerMessage) ctx.addIssue({code:"custom",path:["customerMessage"],message:"Write a customer update before sending it."}) })

export type CreateFlightChangeRequestInput = z.infer<typeof createFlightChangeRequestSchema>
export type FlightChangeSearchInput = z.infer<typeof flightChangeSearchSchema>
