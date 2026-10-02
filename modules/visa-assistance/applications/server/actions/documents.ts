"use server"

import { revalidatePath } from "next/cache"

import type { VisaDocumentMetadata } from "@/modules/visa-assistance/applications/domain"
import { requireVisaApplicationActor } from "@/modules/visa-assistance/applications/server/authorization"
import {
  completeVisaDocumentUpload,
  createVisaDocumentUpload,
  deleteVisaApplicationDocument,
} from "@/modules/visa-assistance/applications/server/document-service"
import { toVisaApplicationActionError } from "@/modules/visa-assistance/applications/server/actions/action-result"

export type CreateUploadIntentResult =
  | {
      ok: true
      documentId: string
      uploadUrl: string
    }
  | {
      ok: false
      message: string
    }

export async function createVisaDocumentUploadIntentAction(
  input: VisaDocumentMetadata
): Promise<CreateUploadIntentResult> {
  try {
    const actor = await requireVisaApplicationActor()
    const result = await createVisaDocumentUpload({
      ...input,
      actorUserId: actor.appUserId,
    })

    return {
      ok: true,
      documentId: result.document.id,
      uploadUrl: result.uploadUrl,
    }
  } catch (error) {
    return toVisaApplicationActionError(error)
  }
}

export async function completeVisaDocumentUploadAction(input: {
  applicationId: string
  documentId: string
}) {
  try {
    const actor = await requireVisaApplicationActor()
    const document = await completeVisaDocumentUpload({
      ...input,
      actorUserId: actor.appUserId,
    })
    revalidateDocuments(input.applicationId)
    return { ok: true, document } as const
  } catch (error) {
    return toVisaApplicationActionError(error)
  }
}

export async function deleteVisaDocumentAction(input: {
  applicationId: string
  documentId: string
}) {
  try {
    const actor = await requireVisaApplicationActor()
    await deleteVisaApplicationDocument({
      ...input,
      actorUserId: actor.appUserId,
    })
    revalidateDocuments(input.applicationId)
    return { ok: true } as const
  } catch (error) {
    return toVisaApplicationActionError(error)
  }
}

function revalidateDocuments(applicationId: string) {
  revalidatePath(`/visa-assistance/applications/${applicationId}/documents`)
  revalidatePath(`/visa-assistance/applications/${applicationId}/review`)
}
