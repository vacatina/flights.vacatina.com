"use server"

import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"

export interface VisaPricingActionState {
  status: "idle" | "success" | "error"
  message: string | null
}

const message =
  "Visa pricing rules are inactive. Manage final fees in Visa Listings."

export async function createVisaPricingRuleFormAction(
  _previous: VisaPricingActionState,
  _formData: FormData
): Promise<VisaPricingActionState> {
  void _previous
  void _formData
  await requireActiveAdmin()
  return { status: "error", message }
}

export async function updateVisaPricingRuleFormAction(
  _previous: VisaPricingActionState,
  _formData: FormData
): Promise<VisaPricingActionState> {
  void _previous
  void _formData
  await requireActiveAdmin()
  return { status: "error", message }
}

export async function toggleVisaPricingRuleFormAction(_formData: FormData) {
  void _formData
  await requireActiveAdmin()
  throw new Error(message)
}
