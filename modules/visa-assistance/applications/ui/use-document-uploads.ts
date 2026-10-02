"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  VISA_DOCUMENT_MIME_TYPES,
  VISA_DOCUMENT_MAX_FILE_SIZE,
  type VisaApplicationDetail,
  type VisaDocumentSlot,
} from "../domain"
import {
  completeVisaDocumentUploadAction,
  createVisaDocumentUploadIntentAction,
  deleteVisaDocumentAction,
} from "../server/actions"
import { uploadFile } from "./upload-file"

export interface UploadState {
  progress: number
  busy: boolean
  message: string | null
}

export function useDocumentUploads(detail: VisaApplicationDetail) {
  const router = useRouter()
  const [documents, setDocuments] = useState(detail.documents)
  const [serverDocuments, setServerDocuments] = useState(detail.documents)
  // Rebase after a server refresh without an effect or stale optimistic state.
  if (serverDocuments !== detail.documents) {
    setServerDocuments(detail.documents)
    setDocuments(detail.documents)
  }
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const busyRef = useRef(false)
  const applicationId = detail.application.id

  const update = (key: string, state: UploadState) =>
    setUploads((current) => ({ ...current, [key]: state }))

  async function upload(slot: VisaDocumentSlot, file: File) {
    if (busyRef.current) return
    busyRef.current = true
    setPageError(null)
    update(slot.key, { busy: true, progress: 1, message: null })
    try {
      const mimeType = VISA_DOCUMENT_MIME_TYPES.find(
        (type) => type === file.type
      )
      if (!mimeType) throw new Error("Choose a PDF, JPG, or PNG file.")
      if (!file.size || file.size > VISA_DOCUMENT_MAX_FILE_SIZE) {
        throw new Error("Choose a file between 1 byte and 10 MB.")
      }
      const intent = await createVisaDocumentUploadIntentAction({
        applicationId,
        travelerId: slot.travelerId,
        requirementId: slot.requirement.id,
        originalFilename: file.name,
        mimeType,
        sizeBytes: file.size,
      })
      if (!intent.ok) throw new Error(intent.message)
      await uploadFile(intent.uploadUrl, file, (progress) =>
        update(slot.key, { busy: true, progress, message: null })
      )
      update(slot.key, { busy: true, progress: 96, message: null })
      const completed = await completeVisaDocumentUploadAction({
        applicationId,
        documentId: intent.documentId,
      })
      if (!completed.ok) throw new Error(completed.message)
      setDocuments((current) => [
        ...current.filter(
          (doc) =>
            !(
              doc.requirementId === slot.requirement.id &&
              doc.travelerId === slot.travelerId
            )
        ),
        completed.document,
      ])
      update(slot.key, { busy: false, progress: 100, message: null })
      router.refresh()
    } catch (error) {
      update(slot.key, {
        busy: false,
        progress: 0,
        message:
          error instanceof Error ? error.message : "Upload failed. Try again.",
      })
    } finally {
      busyRef.current = false
    }
  }

  async function remove(documentId: string) {
    if (busyRef.current) return
    busyRef.current = true
    setDeletingId(documentId)
    setPageError(null)
    try {
      const result = await deleteVisaDocumentAction({
        applicationId,
        documentId,
      })
      if (!result.ok) throw new Error(result.message)
      setDocuments((current) => current.filter((doc) => doc.id !== documentId))
      router.refresh()
    } catch (error) {
      // Refresh failed removals too: deletion_pending must never count as uploaded.
      setDocuments((current) =>
        current.map((doc) =>
          doc.id === documentId
            ? { ...doc, status: "deletion_pending" as const }
            : doc
        )
      )
      router.refresh()
      setPageError(
        error instanceof Error ? error.message : "Removal failed. Retry."
      )
    } finally {
      busyRef.current = false
      setDeletingId(null)
    }
  }
  return {
    documents,
    uploads,
    deletingId,
    pageError,
    upload,
    remove,
    busy:
      Boolean(deletingId) || Object.values(uploads).some((state) => state.busy),
  }
}
