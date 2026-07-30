"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ZodError } from "zod"

import { getActorContext } from "@/modules/auth/server"
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/modules/flights/search/server/types"
import {
  approveCancellation,
  approveRefund,
  createCancellationRequest,
  getCancellationEligibilityContext,
  getCancellationStatusForBooking,
  markManualRefundCompleted,
  moveCancellationToManualProcessing,
  recordCutoffTimingOverride,
  rejectCancellation,
  updateBusinessSettings,
  updateCancellationFeeAndRefund,
  updateCustomerMessage,
  type CancellationEligibilityContext,
  type CancellationStatusSummary,
} from "@/modules/flights/cancellations/server/service"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import { logFlightFlowError } from "@/lib/logging/flow-debug"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"

export async function getCancellationEligibilityAction(
  input: unknown
): Promise<ActionResult<CancellationEligibilityContext>> {
  const bookingReference = readString(input, "bookingReference")

  if (!bookingReference) {
    return actionFailure("VALIDATION_ERROR", "Booking reference is required.")
  }

  try {
    const actor = await getActorContext({ ensureGuestSession: true })
    const context = await getCancellationEligibilityContext({
      bookingReference,
      actor,
    })
    return actionSuccess(context)
  } catch (error) {
    logFlightFlowError("cancellations.actions", "eligibility_failed", error)
    return actionFailure("UPSTREAM_ERROR", "Unable to load cancellation details.")
  }
}

export async function getCancellationStatusForBookingAction(
  input: unknown
): Promise<ActionResult<CancellationStatusSummary | null>> {
  const bookingReference = readString(input, "bookingReference")

  if (!bookingReference) {
    return actionFailure("VALIDATION_ERROR", "Booking reference is required.")
  }

  try {
    const actor = await getActorContext({ ensureGuestSession: false })
    const status = await getCancellationStatusForBooking({
      bookingReference,
      actor,
    })
    return actionSuccess(status)
  } catch (error) {
    logFlightFlowError("cancellations.actions", "status_failed", error)
    return actionFailure("UPSTREAM_ERROR", "Unable to load cancellation status.")
  }
}

export async function createCancellationRequestFormAction(formData: FormData) {
  const bookingReference = formData.get("bookingReference")
  const customerReason = formData.get("customerReason")

  try {
    const actor = await getActorContext({ ensureGuestSession: true })
    await createCancellationRequest({
      bookingReference: String(bookingReference ?? ""),
      customerReason: String(customerReason ?? ""),
      actor,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      redirect(
        `/booking/${encodeURIComponent(String(bookingReference ?? ""))}/cancel?error=${encodeURIComponent(error.issues[0]?.message ?? "Invalid cancellation request.")}`
      )
    }

    logFlightFlowError("cancellations.actions", "create_failed", error, {
      bookingReference: String(bookingReference ?? ""),
    })
    redirect(
      `/booking/${encodeURIComponent(String(bookingReference ?? ""))}/cancel?error=${encodeURIComponent(toSafeUserErrorMessage(error instanceof Error ? error.message : null, "Unable to create cancellation request."))}`
    )
  }

  revalidatePath(`/booking/${encodeURIComponent(String(bookingReference ?? ""))}`)
  redirect(`/booking/${encodeURIComponent(String(bookingReference ?? ""))}/cancel?submitted=1`)
}

export async function approveCancellationFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const requestId = requireFormString(formData, "requestId")
  await approveCancellation({ requestId, admin })
  revalidateAdminCancellation(requestId)
}

export async function rejectCancellationFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const requestId = requireFormString(formData, "requestId")
  const reason = requireFormString(formData, "reason")
  await rejectCancellation({ requestId, admin, reason })
  revalidateAdminCancellation(requestId)
}

export async function moveManualProcessingFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const requestId = requireFormString(formData, "requestId")
  await moveCancellationToManualProcessing({
    requestId,
    admin,
    message: stringOrNull(formData.get("message")),
  })
  revalidateAdminCancellation(requestId)
}

export async function approveRefundFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const requestId = requireFormString(formData, "requestId")
  await approveRefund({ requestId, admin })
  revalidateAdminCancellation(requestId)
}

export async function markManualRefundCompletedFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const requestId = requireFormString(formData, "requestId")
  await markManualRefundCompleted({ requestId, admin })
  revalidateAdminCancellation(requestId)
}

export async function updateCancellationFeeRefundFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const requestId = requireFormString(formData, "requestId")
  await updateCancellationFeeAndRefund({
    requestId,
    admin,
    feeType: parseFeeType(requireFormString(formData, "feeType")),
    feeValue: Number(requireFormString(formData, "feeValue")),
    airlineRefundAmount: Number(requireFormString(formData, "airlineRefundAmount")),
    customerRefundCurrency: requireFormString(formData, "customerRefundCurrency"),
  })
  revalidateAdminCancellation(requestId)
}

export async function updateCustomerMessageFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const requestId = requireFormString(formData, "requestId")
  await updateCustomerMessage({
    requestId,
    admin,
    message: requireFormString(formData, "message"),
  })
  revalidateAdminCancellation(requestId)
}

export async function recordCutoffOverrideFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const requestId = requireFormString(formData, "requestId")
  await recordCutoffTimingOverride({
    requestId,
    admin,
    reason: requireFormString(formData, "reason"),
  })
  revalidateAdminCancellation(requestId)
}

export async function updateBusinessSettingsFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  await updateBusinessSettings({
    admin,
    businessName: requireFormString(formData, "businessName"),
    supportEmail: requireFormString(formData, "supportEmail"),
    supportPhone: requireFormString(formData, "supportPhone"),
    supportWhatsapp: requireFormString(formData, "supportWhatsapp"),
    address: requireFormString(formData, "address"),
    timezone: requireFormString(formData, "timezone"),
  })
  revalidatePath("/admin/settings")
}

function revalidateAdminCancellation(requestId: string) {
  revalidatePath("/admin/cancellations")
  revalidatePath(`/admin/cancellations/${requestId}`)
}

function requireFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`)
  }

  return value.trim()
}

function stringOrNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function parseFeeType(value: string) {
  if (value === "fixed" || value === "percent" || value === "none") {
    return value
  }

  throw new Error("Invalid fee type.")
}

function readString(input: unknown, key: string) {
  if (!input || typeof input !== "object") {
    return null
  }

  const value = (input as Record<string, unknown>)[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}
