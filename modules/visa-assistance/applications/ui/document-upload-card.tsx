"use client"
import { useId, useRef } from "react"
import {
  CheckCircle2Icon,
  FileIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import type {
  VisaApplicationDocument,
  VisaDocumentRequirement,
} from "../domain"
import type { UploadState } from "./use-document-uploads"
export function DocumentUploadCard({
  applicationId,
  option,
  documents,
  uploadState,
  deletingId,
  busy,
  onUpload,
  onDelete,
}: {
  applicationId: string
  option: VisaDocumentRequirement
  documents: VisaApplicationDocument[]
  uploadState?: UploadState
  deletingId: string | null
  busy: boolean
  onUpload: (file: File) => void
  onDelete: (documentId: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const uploading = Boolean(uploadState?.busy)

  return (
    <div className="min-w-0 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
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
        {documents.some((doc) => doc.status === "uploaded") ? (
          <CheckCircle2Icon
            className="size-5 text-primary"
            aria-label="Uploaded"
          />
        ) : (
          <FileIcon className="size-5 text-primary" aria-hidden="true" />
        )}
      </div>

      {option.instructions ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {option.instructions}
        </p>
      ) : null}

      {documents.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {documents.map((document) => {
            const deleting = deletingId === document.id

            return (
              <div key={document.id} className="rounded-md bg-muted/50 p-3">
                {document.status === "uploaded" ? (
                  <a
                    href={`/api/visa-applications/${applicationId}/documents/${document.id}`}
                    className="block truncate text-sm font-medium text-primary hover:underline"
                  >
                    {document.originalFilename}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium">
                    {document.originalFilename}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {document.status === "deletion_pending"
                    ? "Removal pending · retry below"
                    : formatFileSize(document.sizeBytes)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 text-destructive"
                  disabled={busy}
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

      <div className="mt-4 rounded-xl border border-dashed border-primary/25 bg-primary/[0.035] p-3">
        <input
          id={inputId}
          aria-label={`Upload ${option.label}`}
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          disabled={busy}
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
          className="h-10 w-full rounded-lg border-primary/15 bg-white text-primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <UploadCloudIcon data-icon="inline-start" />
          )}
          {uploading
            ? uploadState && uploadState.progress >= 96
              ? "Verifying file..."
              : "Uploading..."
            : documents.length > 0
              ? "Replace file"
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
    </div>
  )
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}
