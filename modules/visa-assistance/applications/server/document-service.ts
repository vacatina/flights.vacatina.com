import "server-only"

import {
  completeDocumentUploadSchema,
  documentMetadataSchema,
  isVisaApplicationEditable,
} from "@/modules/visa-assistance/applications/domain"
import {
  addVisaApplicationEvent,
  createVisaApplicationDocument,
  findVisaApplicationDocument,
  updateVisaApplicationDocument,
} from "@/modules/visa-assistance/applications/server/application-repository"
import { getOwnedVisaApplication } from "@/modules/visa-assistance/applications/server/application-service"
import { createVisaDocumentId } from "@/modules/visa-assistance/applications/server/ids"
import {
  createR2DownloadUrl,
  createR2UploadUrl,
  deleteR2Object,
  headR2Object,
} from "@/modules/visa-assistance/applications/server/r2-storage"

export async function createVisaDocumentUpload(input: {
  actorUserId: string
  applicationId: string
  travelerId: string
  documentType:
    | "passport_bio_page"
    | "passport_photo"
    | "national_id_front"
    | "national_id_back"
    | "additional"
  originalFilename: string
  mimeType: "application/pdf" | "image/jpeg" | "image/png"
  sizeBytes: number
}) {
  const parsed = documentMetadataSchema.parse(input)
  const detail = await requireEditableApplication(
    parsed.applicationId,
    input.actorUserId
  )
  const ownsTraveler = detail.travelers.some(
    (traveler) => traveler.id === parsed.travelerId
  )

  if (!ownsTraveler) {
    throw new Error("Traveler not found.")
  }

  const documentId = createVisaDocumentId()
  const objectKey = [
    "visa-applications",
    parsed.applicationId,
    parsed.travelerId,
    documentId,
  ].join("/")
  const document = await createVisaApplicationDocument({
    id: documentId,
    applicationId: parsed.applicationId,
    travelerId: parsed.travelerId,
    documentType: parsed.documentType,
    status: "pending_upload",
    objectKey,
    originalFilename: parsed.originalFilename,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
  })

  try {
    const uploadUrl = await createR2UploadUrl({
      objectKey,
      contentType: parsed.mimeType,
    })
    return { document, uploadUrl }
  } catch (error) {
    await updateVisaApplicationDocument(documentId, {
      status: "upload_failed",
    })
    throw error
  }
}

export async function completeVisaDocumentUpload(input: {
  actorUserId: string
  applicationId: string
  documentId: string
}) {
  const parsed = completeDocumentUploadSchema.parse(input)
  await requireEditableApplication(parsed.applicationId, input.actorUserId)
  const document = await requireApplicationDocument(
    parsed.applicationId,
    parsed.documentId
  )

  if (document.status === "uploaded") {
    return document
  }

  if (document.status !== "pending_upload") {
    throw new Error("This document upload cannot be completed.")
  }

  const object = await headR2Object(document.objectKey)
  const contentType = object.ContentType?.toLowerCase()
  const valid =
    object.ContentLength === document.sizeBytes &&
    contentType === document.mimeType.toLowerCase()

  if (!valid) {
    await deleteR2Object(document.objectKey)
    await updateVisaApplicationDocument(document.id, {
      status: "upload_failed",
    })
    throw new Error("The uploaded file did not match the selected document.")
  }

  const updated = await updateVisaApplicationDocument(document.id, {
    status: "uploaded",
    etag: object.ETag ?? null,
    uploadedAt: new Date(),
  })
  await addVisaApplicationEvent({
    applicationId: parsed.applicationId,
    actorUserId: input.actorUserId,
    eventType: "document_uploaded",
    metadata: {
      documentId: document.id,
      documentType: document.documentType,
    },
  })

  return updated
}

export async function deleteVisaApplicationDocument(input: {
  actorUserId: string
  applicationId: string
  documentId: string
}) {
  await requireEditableApplication(input.applicationId, input.actorUserId)
  const document = await requireApplicationDocument(
    input.applicationId,
    input.documentId
  )

  if (document.status === "deleted") {
    return
  }

  await updateVisaApplicationDocument(document.id, {
    status: "deletion_pending",
  })

  try {
    await deleteR2Object(document.objectKey)
    await updateVisaApplicationDocument(document.id, {
      status: "deleted",
      deletedAt: new Date(),
    })
    await addVisaApplicationEvent({
      applicationId: input.applicationId,
      actorUserId: input.actorUserId,
      eventType: "document_deleted",
      metadata: { documentId: document.id },
    })
  } catch (error) {
    await updateVisaApplicationDocument(document.id, {
      status: "deletion_pending",
    })
    throw error
  }
}

export async function getVisaDocumentDownloadUrl(input: {
  applicationId: string
  documentId: string
}) {
  const document = await requireApplicationDocument(
    input.applicationId,
    input.documentId
  )

  if (document.status !== "uploaded") {
    throw new Error("This document is not available.")
  }

  return createR2DownloadUrl({
    objectKey: document.objectKey,
    filename: document.originalFilename,
  })
}

async function requireApplicationDocument(
  applicationId: string,
  documentId: string
) {
  const document = await findVisaApplicationDocument(documentId)

  if (!document || document.applicationId !== applicationId) {
    throw new Error("Document not found.")
  }

  return document
}

async function requireEditableApplication(
  applicationId: string,
  actorUserId: string
) {
  const detail = await getOwnedVisaApplication(applicationId, actorUserId)

  if (!isVisaApplicationEditable(detail.application.status)) {
    throw new Error("This visa request can no longer be edited.")
  }

  return detail
}
