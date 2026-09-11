"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2Icon,
  FileIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import {
  VISA_DOCUMENT_MAX_FILE_SIZE,
  VISA_DOCUMENT_MIME_TYPES,
  type VisaApplicationDocument,
  type VisaApplicationTraveler,
  type VisaDocumentType,
} from "@/modules/visa-assistance/applications/domain"
import {
  completeVisaDocumentUploadAction,
  createVisaDocumentUploadIntentAction,
  deleteVisaDocumentAction,
} from "@/modules/visa-assistance/applications/server/actions"
import { VisaFormActions } from "@/modules/visa-assistance/applications/ui/form-actions"
import { VisaFormError } from "@/modules/visa-assistance/applications/ui/form-feedback"

const documentOptions: Array<{
  type: VisaDocumentType
  label: string
  required: boolean
}> = [
  { type: "passport_bio_page", label: "Passport bio page", required: true },
  { type: "passport_photo", label: "Passport photo", required: false },
  { type: "national_id_front", label: "National ID front", required: false },
  { type: "national_id_back", label: "National ID back", required: false },
  { type: "additional", label: "Additional document", required: false },
]

interface UploadState {
  progress: number
  message: string | null
}

export function DocumentsStep({
  applicationId,
  travelers,
  documents,
}: {
  applicationId: string
  travelers: VisaApplicationTraveler[]
  documents: VisaApplicationDocument[]
}) {
  const router = useRouter()
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const passportTravelerIds = new Set(
    documents
      .filter(
        (document) =>
          document.documentType === "passport_bio_page" &&
          document.status === "uploaded"
      )
      .map((document) => document.travelerId)
  )
  const passportsComplete = travelers.every((traveler) =>
    passportTravelerIds.has(traveler.id)
  )

  async function upload(
    travelerId: string,
    documentType: VisaDocumentType,
    file: File
  ) {
    const key = `${travelerId}:${documentType}`
    setPageError(null)

    if (!VISA_DOCUMENT_MIME_TYPES.includes(file.type as never)) {
      setUploads((current) => ({
        ...current,
        [key]: { progress: 0, message: "Choose a PDF, JPG, or PNG file." },
      }))
      return
    }

    if (file.size > VISA_DOCUMENT_MAX_FILE_SIZE) {
      setUploads((current) => ({
        ...current,
        [key]: { progress: 0, message: "File size must be 10 MB or less." },
      }))
      return
    }

    setUploads((current) => ({
      ...current,
      [key]: { progress: 1, message: null },
    }))

    const intent = await createVisaDocumentUploadIntentAction({
      applicationId,
      travelerId,
      documentType,
      originalFilename: file.name,
      mimeType: file.type as (typeof VISA_DOCUMENT_MIME_TYPES)[number],
      sizeBytes: file.size,
    })

    if (!intent.ok) {
      setUploads((current) => ({
        ...current,
        [key]: { progress: 0, message: intent.message },
      }))
      return
    }

    try {
      await uploadFile(intent.uploadUrl, file, (progress) => {
        setUploads((current) => ({
          ...current,
          [key]: { progress, message: null },
        }))
      })
      const completed = await completeVisaDocumentUploadAction({
        applicationId,
        documentId: intent.documentId,
      })

      if (!completed.ok) {
        throw new Error(completed.message)
      }

      setUploads((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      router.refresh()
    } catch (error) {
      setUploads((current) => ({
        ...current,
        [key]: {
          progress: 0,
          message:
            error instanceof Error
              ? error.message
              : "Upload failed. Try again.",
        },
      }))
    }
  }

  async function remove(documentId: string) {
    setDeletingId(documentId)
    setPageError(null)
    const result = await deleteVisaDocumentAction({
      applicationId,
      documentId,
    })
    setDeletingId(null)

    if (!result.ok) {
      setPageError(result.message)
      return
    }

    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Supporting documents</CardTitle>
        <CardDescription>
          Upload a clear passport bio page for each traveler. Other files can be
          added now or requested later by our team.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <VisaFormError message={pageError} />
        <Alert>
          <FileIcon aria-hidden="true" />
          <AlertTitle>Before you upload</AlertTitle>
          <AlertDescription>
            Use a clear PDF, JPG, or PNG file up to 10 MB. Make sure all text
            and the full document edges are visible.
          </AlertDescription>
        </Alert>

        {travelers.map((traveler, index) => (
          <section
            key={traveler.id}
            className="overflow-hidden rounded-xl border bg-muted/15"
          >
            <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-3 md:px-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Traveler {index + 1}
                </p>
                <h2 className="font-semibold">
                  {traveler.firstName} {traveler.lastName}
                </h2>
              </div>
              <Badge
                className="ml-auto"
                variant={
                  passportTravelerIds.has(traveler.id) ? "secondary" : "outline"
                }
              >
                {passportTravelerIds.has(traveler.id)
                  ? "Required file added"
                  : "Passport required"}
              </Badge>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-5">
              {documentOptions.map((option) => {
                const uploaded = uploadedDocuments(
                  documents,
                  traveler.id,
                  option.type
                )
                const key = `${traveler.id}:${option.type}`

                return (
                  <DocumentUploadCard
                    key={option.type}
                    applicationId={applicationId}
                    option={option}
                    documents={uploaded}
                    uploadState={uploads[key]}
                    deletingId={deletingId}
                    onUpload={(file) => upload(traveler.id, option.type, file)}
                    onDelete={remove}
                  />
                )
              })}
            </div>
          </section>
        ))}
      </CardContent>
      <CardFooter className="flex-col gap-3 border-t bg-muted/20 sm:items-end">
        <VisaFormActions
          backHref={`/visa-assistance/applications/${applicationId}/contact`}
          nextHref={`/visa-assistance/applications/${applicationId}/review`}
          isPending={false}
          disabled={!passportsComplete}
        />
        {!passportsComplete ? (
          <p className="w-full text-right text-xs text-muted-foreground">
            Upload a passport bio page for every traveler to continue.
          </p>
        ) : null}
      </CardFooter>
    </Card>
  )
}

function DocumentUploadCard({
  applicationId,
  option,
  documents,
  uploadState,
  deletingId,
  onUpload,
  onDelete,
}: {
  applicationId: string
  option: (typeof documentOptions)[number]
  documents: VisaApplicationDocument[]
  uploadState?: UploadState
  deletingId: string | null
  onUpload: (file: File) => void
  onDelete: (documentId: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploading = Boolean(uploadState?.progress)
  const canUpload = option.type === "additional" || documents.length === 0

  return (
    <div className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{option.label}</p>
          <Badge
            className="mt-2"
            variant={option.required ? "default" : "outline"}
          >
            {option.required ? "Required" : "Optional"}
          </Badge>
        </div>
        {documents.length > 0 ? (
          <CheckCircle2Icon
            className="size-5 text-primary"
            aria-label="Uploaded"
          />
        ) : (
          <FileIcon
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {documents.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {documents.map((document) => {
            const deleting = deletingId === document.id

            return (
              <div key={document.id} className="rounded-md bg-muted/50 p-3">
                <a
                  href={`/api/visa-applications/${applicationId}/documents/${document.id}`}
                  className="block truncate text-sm font-medium text-primary hover:underline"
                >
                  {document.originalFilename}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatFileSize(document.sizeBytes)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 text-destructive"
                  disabled={deleting}
                  onClick={() => onDelete(document.id)}
                >
                  {deleting ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Trash2Icon data-icon="inline-start" />
                  )}
                  {deleting ? "Removing..." : "Remove"}
                </Button>
              </div>
            )
          })}
        </div>
      ) : null}

      {canUpload ? (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onUpload(file)
              event.target.value = ""
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <UploadCloudIcon data-icon="inline-start" />
            )}
            {uploading
              ? "Uploading..."
              : documents.length > 0
                ? "Add another file"
                : "Choose file"}
          </Button>
          {uploading ? (
            <Progress className="mt-3" value={uploadState?.progress ?? 0} />
          ) : null}
          {uploadState?.message ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {uploadState.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function uploadedDocuments(
  documents: VisaApplicationDocument[],
  travelerId: string,
  type: VisaDocumentType
) {
  return documents.filter(
    (document) =>
      document.travelerId === travelerId &&
      document.documentType === type &&
      document.status === "uploaded"
  )
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function uploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", uploadUrl)
    request.setRequestHeader("Content-Type", file.type)
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        resolve()
      } else {
        reject(new Error("Upload failed. Try again."))
      }
    })
    request.addEventListener("error", () => {
      reject(new Error("Upload failed. Check your connection and try again."))
    })
    request.send(file)
  })
}
