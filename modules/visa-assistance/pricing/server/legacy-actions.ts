"use server"

import { revalidatePath } from "next/cache"

import { requireActiveAdmin } from "@/modules/flights/cancellations/server"
import {
  createVisaPricingRule,
  setVisaPricingRuleEnabled,
  updateVisaPricingRule,
} from "@/modules/visa-assistance/pricing/server/admin-service"

export interface VisaPricingActionState {
  status: "idle" | "success" | "error"
  message: string | null
}

export async function createVisaPricingRuleFormAction(
  _previous: VisaPricingActionState,
  formData: FormData
): Promise<VisaPricingActionState> {
  try {
    const admin = await requireActiveAdmin()
    await createVisaPricingRule({
      ...readRuleForm(formData),
      actorUserId: admin.appUserId,
    })
    revalidateVisaPricing()
    return { status: "success", message: "Visa pricing rule created." }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) }
  }
}

export async function updateVisaPricingRuleFormAction(
  _previous: VisaPricingActionState,
  formData: FormData
): Promise<VisaPricingActionState> {
  try {
    const admin = await requireActiveAdmin()
    const id = requireString(formData, "id")
    await updateVisaPricingRule({
      ...readRuleForm(formData),
      id,
      actorUserId: admin.appUserId,
    })
    revalidateVisaPricing(id)
    return { status: "success", message: "Visa pricing rule updated." }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) }
  }
}

export async function toggleVisaPricingRuleFormAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const id = requireString(formData, "id")
  const enabled = requireString(formData, "enabled") === "true"
  await setVisaPricingRuleEnabled({
    id,
    enabled,
    actorUserId: admin.appUserId,
    reason: "Status changed from the visa pricing directory.",
  })
  revalidateVisaPricing(id)
}

function readRuleForm(formData: FormData) {
  return {
    name: requireString(formData, "name"),
    priority: Number(requireString(formData, "priority")),
    feeComponent: requireString(formData, "feeComponent") as
      "processing_fee" | "government_fee",
    adjustmentType: requireString(formData, "adjustmentType") as
      "percent" | "fixed",
    adjustmentValue: requireString(formData, "adjustmentValue"),
    adjustmentCurrency: optionalString(formData, "adjustmentCurrency"),
    nationalityCode: optionalString(formData, "nationalityCode"),
    destinationCode: optionalString(formData, "destinationCode"),
    visaTypeId: optionalString(formData, "visaTypeId"),
    providerProductId: optionalString(formData, "providerProductId"),
    activeFrom: optionalDate(formData, "activeFrom"),
    activeTo: optionalDate(formData, "activeTo"),
    reason: optionalString(formData, "reason"),
  }
}

function requireString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`)
  }
  return value.trim()
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalString(formData, key)
  if (!value) return null
  const date = new Date(`${value}:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new Error(`${key} is invalid.`)
  return date
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The pricing rule could not be saved."
}

function revalidateVisaPricing(id?: string) {
  revalidatePath("/admin/visa-pricing")
  if (id) revalidatePath(`/admin/visa-pricing/${id}`)
  revalidatePath("/visa-assistance", "layout")
}
