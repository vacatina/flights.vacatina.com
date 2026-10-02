import { VisaApplicationError } from "@/modules/visa-assistance/applications/domain/application-error"
import "server-only"

import {
  completeDocumentUploadSchema,
  documentMetadataSchema,
  assertDocumentSlot,
  type VisaDocumentMetadata,
} from "../domain"
import {
  addVisaApplicationEvent,
  createVisaApplicationDocument,
  findVisaApplicationDocument,
  updateVisaApplicationDocument,
  withEditableVisaApplication,
} from "./application-repository"
import { createVisaDocumentId } from "./ids"
import {
  createR2DownloadUrl,
  createR2UploadUrl,
  deleteR2Object,
  headR2Object,
} from "./r2-storage"

export async function createVisaDocumentUpload(
  input: VisaDocumentMetadata & { actorUserId: string }
) {
  const parsed = documentMetadataSchema.parse(input)
  return withEditableVisaApplication(
    parsed.applicationId,
    input.actorUserId,
    async (tx, detail) => {
      assertDocumentSlot(detail, parsed.requirementId, parsed.travelerId)
      const id = createVisaDocumentId()
      const objectKey = [
        "visa-applications",
        parsed.applicationId,
        parsed.travelerId ?? "shared",
        parsed.requirementId,
        id,
      ].join("/")
      // Sign before inserting: a signing failure must not leave a pending row.
      const uploadUrl = await createR2UploadUrl({
        objectKey,
        contentType: parsed.mimeType,
      })
      const document = await createVisaApplicationDocument(
        {
          ...parsed,
          id,
          objectKey,
          status: "pending_upload",
        },
        tx
      )
      return { document, uploadUrl }
    }
  )
}

export async function completeVisaDocumentUpload(input: {
  actorUserId: string
  applicationId: string
  documentId: string
}) {
  const parsed = completeDocumentUploadSchema.parse(input)
  const result = await withEditableVisaApplication(
    parsed.applicationId,
    input.actorUserId,
    async (tx, detail) => {
      const document = detail.documents.find(
        (item) => item.id === parsed.documentId
      )
      if (!document) throw new VisaApplicationError("Document not found.")
      assertDocumentSlot(detail, document.requirementId, document.travelerId)
      if (document.status === "uploaded")
        return { ok: true as const, document, replaced: [] }
      if (document.status !== "pending_upload") {
        throw new VisaApplicationError(
          "This upload cannot be completed. Choose the file again."
        )
      }
      const object = await headR2Object(document.objectKey)
      if (
        object.ContentLength !== document.sizeBytes ||
        object.ContentType?.toLowerCase() !== document.mimeType.toLowerCase()
      ) {
        await updateVisaApplicationDocument(
          document.id,
          { status: "upload_failed" },
          tx
        )
        // Return, then throw outside the transaction so failure state is committed.
        return {
          ok: false as const,
          error: "The uploaded file did not match the selected document.",
          key: document.objectKey,
        }
      }
      const replaced = detail.documents.filter(
        (item) =>
          item.id !== document.id &&
          item.status === "uploaded" &&
          item.requirementId === document.requirementId &&
          item.travelerId === document.travelerId
      )
      for (const old of replaced) {
        await updateVisaApplicationDocument(
          old.id,
          { status: "deletion_pending" },
          tx
        )
      }
      const updated = await updateVisaApplicationDocument(
        document.id,
        {
          status: "uploaded",
          etag: object.ETag ?? null,
          uploadedAt: new Date(),
        },
        tx
      )
      if (!updated) throw new VisaApplicationError("Document not found.")
      await addVisaApplicationEvent(
        {
          applicationId: parsed.applicationId,
          actorUserId: input.actorUserId,
          eventType: "document_uploaded",
          metadata: {
            documentId: document.id,
            requirementId: document.requirementId,
          },
        },
        tx
      )
      return { ok: true as const, document: updated, replaced }
    }
  )
  if (!result.ok) {
    await deleteR2Object(result.key).catch(() => undefined)
    throw new VisaApplicationError(result.error)
  }
  for (const old of result.replaced) {
    await deleteR2Object(old.objectKey)
      .then(() =>
        updateVisaApplicationDocument(old.id, {
          status: "deleted",
          deletedAt: new Date(),
        })
      )
      .catch(() => undefined) // Retain deletion_pending and key for cleanup retry.
  }
  return result.document
}

export async function deleteVisaApplicationDocument(input: {
  actorUserId: string
  applicationId: string
  documentId: string
}) {
  const parsed = completeDocumentUploadSchema.parse(input)
  const result = await withEditableVisaApplication(
    parsed.applicationId,
    input.actorUserId,
    async (tx, detail) => {
      const document = detail.documents.find(
        (item) => item.id === parsed.documentId
      )
      if (!document) throw new VisaApplicationError("Document not found.")
      assertDocumentSlot(detail, document.requirementId, document.travelerId)
      await updateVisaApplicationDocument(
        document.id,
        { status: "deletion_pending" },
        tx
      )
      try {
        await deleteR2Object(document.objectKey)
      } catch {
        return { error: "File removal failed. Please retry." }
      }
      await updateVisaApplicationDocument(
        document.id,
        {
          status: "deleted",
          deletedAt: new Date(),
        },
        tx
      )
      await addVisaApplicationEvent(
        {
          applicationId: parsed.applicationId,
          actorUserId: input.actorUserId,
          eventType: "document_deleted",
          metadata: { documentId: document.id },
        },
        tx
      )
      return { error: null }
    }
  )
  if (result.error) throw new VisaApplicationError(result.error)
}

export async function getVisaDocumentDownloadUrl(input: {
  applicationId: string
  documentId: string
}) {
  const document = await findVisaApplicationDocument(input.documentId)
  if (
    !document ||
    document.applicationId !== input.applicationId ||
    document.status !== "uploaded"
  )
    throw new VisaApplicationError("This document is not available.")
  return createR2DownloadUrl({
    objectKey: document.objectKey,
    filename: document.originalFilename,
  })
}
