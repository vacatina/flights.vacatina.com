"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { logFlightFlowError } from "@/lib/logging/flow-debug"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import { canAdminReconcilePayment } from "@/modules/payments/server/admin-service"
import { defaultPaymentAttemptsRepository } from "@/modules/payments/server/attempts-repository"
import { reconcilePaymentAttemptById } from "@/modules/payments/server/reconciliation-service"
import { paymentProductAdapterRequired } from "@/modules/payments/server/service"

export async function startPayPalPaymentAction(): Promise<never> {
  paymentProductAdapterRequired()
}

export async function capturePayPalPaymentAction(): Promise<never> {
  paymentProductAdapterRequired()
}

export async function getPaymentStatusAction(): Promise<never> {
  paymentProductAdapterRequired()
}

export async function reconcileAdminPaymentFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const paymentAttemptId = requireFormString(formData, "paymentAttemptId")

  try {
    const current =
      await defaultPaymentAttemptsRepository.findById(paymentAttemptId)

    if (!current) {
      throw new Error("Payment attempt was not found.")
    }

    if (!canAdminReconcilePayment(current.status, current.providerOrderId)) {
      throw new Error("This settled payment no longer needs reconciliation.")
    }

    const payment = await reconcilePaymentAttemptById({ paymentAttemptId })

    if (!payment) {
      throw new Error("Payment attempt was not found.")
    }
  } catch (error) {
    logFlightFlowError("payments.admin", "reconciliation_failed", error, {
      paymentAttemptId,
      adminId: admin.appUserId,
    })
    redirect(
      `/admin/payments/${encodeURIComponent(paymentAttemptId)}?error=${encodeURIComponent(
        toSafeUserErrorMessage(
          error instanceof Error ? error.message : null,
          "Unable to check the provider payment status."
        )
      )}`
    )
  }

  revalidatePath("/admin/payments")
  revalidatePath(`/admin/payments/${encodeURIComponent(paymentAttemptId)}`)
  redirect(
    `/admin/payments/${encodeURIComponent(paymentAttemptId)}?reconciled=1`
  )
}

function requireFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`)
  }

  return value.trim()
}
