"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireActiveAdmin } from "@/modules/flights/cancellations/server"
import { VISA_APPLICATION_STATUSES } from "@/modules/visa-assistance/applications/domain"
import { updateAdminVisaApplication } from "@/modules/visa-assistance/applications/server/application-repository"

const adminUpdateSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(VISA_APPLICATION_STATUSES),
  internalNotes: z.string().trim().max(10_000).optional(),
})

export async function updateVisaApplicationAdminAction(formData: FormData) {
  const admin = await requireActiveAdmin()
  const parsed = adminUpdateSchema.parse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
    internalNotes: formData.get("internalNotes"),
  })

  const updated = await updateAdminVisaApplication({
    applicationId: parsed.applicationId,
    status: parsed.status,
    internalNotes: parsed.internalNotes || null,
    actorUserId: admin.appUserId,
  })

  if (!updated) {
    throw new Error("Visa request not found.")
  }

  revalidatePath("/admin/visa-applications")
  revalidatePath(`/admin/visa-applications/${parsed.applicationId}`)
}
