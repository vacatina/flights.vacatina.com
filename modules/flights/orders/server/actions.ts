"use server"

import { headers } from "next/headers"
import { ZodError } from "zod"

import { resolveActionActorContext } from "@/modules/auth/server"
import type { ActorContext } from "@/modules/auth/types"
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/modules/flights/search/server/types"
import {
  bookingDetailInputSchema,
  bookingListInputSchema,
  bookingLookupInputSchema,
  type BookingDetailModel,
  type BookingListItem,
} from "@/modules/flights/orders/domain"
import {
  getBookingDetail,
  listMyBookings,
  lookupBookingByReferenceAndEmail,
} from "@/modules/flights/orders/server/service"
import { logFlightFlowError } from "@/lib/logging/flow-debug"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"

interface OrdersActionDeps {
  getActorContext?: () => Promise<ActorContext>
}

export async function lookupBookingAction(
  input: unknown
): Promise<ActionResult<{ bookingReference: string }>> {
  return executeLookupBookingAction(input)
}

export async function listMyBookingsAction(
  input: unknown
): Promise<ActionResult<{ page: number; pageSize: number; total: number; items: BookingListItem[] }>> {
  return executeListMyBookingsAction(input)
}

export async function getBookingDetailAction(
  input: unknown
): Promise<ActionResult<BookingDetailModel>> {
  return executeGetBookingDetailAction(input)
}

export async function executeLookupBookingAction(
  input: unknown
): Promise<ActionResult<{ bookingReference: string }>> {
  const parsed = bookingLookupInputSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid booking lookup payload"
    )
  }

  const requestHeaders = await headers()
  const ipAddress = extractIpAddress(requestHeaders)

  try {
    const result = await lookupBookingByReferenceAndEmail({
      ...parsed.data,
      ipAddress,
    })
    return actionSuccess(result)
  } catch (error) {
    logFlightFlowError("lookupBookingAction", "lookup_failed", error, {
      bookingReference: parsed.data.reference,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      toSafeUserErrorMessage(error instanceof Error ? error.message : null, "Booking not found. Please check your reference and email.")
    )
  }
}

export async function executeListMyBookingsAction(
  input: unknown,
  deps: OrdersActionDeps = {}
): Promise<ActionResult<{ page: number; pageSize: number; total: number; items: BookingListItem[] }>> {
  const actor = await resolveActionActorContext({
    scope: "orders.actions",
    resolveActor: deps.getActorContext,
  })
  const parsed = bookingListInputSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid booking list payload"
    )
  }

  try {
    const result = await listMyBookings({
      actor,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    })
    return actionSuccess(result)
  } catch (error) {
    logFlightFlowError("listMyBookingsAction", "list_failed", error, {
      actorType: actor.type,
    })
    return actionFailure(
      "UPSTREAM_ERROR",
      toSafeUserErrorMessage(error instanceof Error ? error.message : null, "Unable to load bookings.")
    )
  }
}

export async function executeGetBookingDetailAction(
  input: unknown,
  deps: OrdersActionDeps = {}
): Promise<ActionResult<BookingDetailModel>> {
  const actor = await resolveActionActorContext({
    scope: "orders.actions",
    resolveActor: deps.getActorContext,
  })
  const parsed = bookingDetailInputSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid booking detail payload"
    )
  }

  try {
    const detail = await getBookingDetail({
      reference: parsed.data.reference,
      actor,
    })
    return actionSuccess(detail)
  } catch (error) {
    if (error instanceof ZodError) {
      return actionFailure(
        "VALIDATION_ERROR",
        error.issues[0]?.message ?? "Invalid booking detail payload"
      )
    }
    logFlightFlowError("getBookingDetailAction", "detail_failed", error, {
      actorType: actor.type,
      bookingReference: parsed.data.reference,
    })
    return actionFailure("UPSTREAM_ERROR", "Unable to load booking details.")
  }
}

function extractIpAddress(input: Headers) {
  const forwarded = input.get("x-forwarded-for")
  const realIp = input.get("x-real-ip")
  const firstForwarded = forwarded?.split(",")[0]?.trim()

  return firstForwarded || realIp || "unknown"
}
