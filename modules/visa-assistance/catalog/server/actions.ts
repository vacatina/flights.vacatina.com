"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import { toListingFormValues } from "@/modules/visa-assistance/catalog/domain/form-values"
import {
  visaListingInputSchema,
  type ParsedVisaListingInput,
} from "@/modules/visa-assistance/catalog/domain/listing"
import { CatalogError } from "./database"
import { saveVisaListing, unpublishVisaListing } from "./writes"

export type CatalogActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      message: string
      fields: Array<{ path: string; message: string }>
    }

const saveRequestSchema = z.object({
  id: z.string().uuid().optional(),
  intent: z.enum(["save", "publish"]),
  values: visaListingInputSchema,
})

export async function saveVisaListingAction(input: unknown): Promise<
  CatalogActionResult<{
    id: string
    status: "draft" | "published"
    values: ParsedVisaListingInput
  }>
> {
  const admin = await requireActiveAdmin()
  try {
    const request = saveRequestSchema.parse(input)
    const listing = await saveVisaListing(request.values, admin.appUserId, {
      id: request.id,
      publish: request.intent === "publish",
    })
    revalidateCatalog(listing.id)
    return {
      ok: true,
      data: {
        id: listing.id,
        status: listing.status,
        values: toListingFormValues(listing),
      },
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function unpublishVisaListingAction(
  input: unknown
): Promise<CatalogActionResult<null>> {
  const admin = await requireActiveAdmin()
  try {
    const id = z.string().uuid().parse(input)
    await unpublishVisaListing(id, admin.appUserId)
    revalidateCatalog(id)
    return { ok: true, data: null }
  } catch (error) {
    return actionError(error)
  }
}

function actionError(error: unknown): CatalogActionResult<never> {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fields: error.issues.map((issue) => ({
        path: issue.path.filter((part) => part !== "values").join("."),
        message: issue.message,
      })),
    }
  }
  if (error instanceof CatalogError) {
    return {
      ok: false,
      message: error.message,
      fields: error.field
        ? [{ path: error.field, message: error.message }]
        : [],
    }
  }
  console.error("Visa catalog action failed", error)
  return {
    ok: false,
    message: "Could not save the listing. Please try again.",
    fields: [],
  }
}

function revalidateCatalog(id: string) {
  revalidatePath("/admin/visa-listings")
  revalidatePath(`/admin/visa-listings/${id}`)
  revalidatePath("/visa-assistance", "layout")
}
