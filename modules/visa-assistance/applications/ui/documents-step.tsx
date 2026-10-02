"use client"

import {
  VisaStepHeader,
  visaFormCard,
  visaFormFooter,
} from "./checkout-surfaces"
import { FileIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  getDocumentSlots,
  getMissingRequiredDocuments,
  type VisaApplicationDetail,
} from "../domain"
import { VisaFormActions } from "./form-actions"
import { VisaFormError } from "./form-feedback"
import { DocumentUploadCard } from "./document-upload-card"
import { useDocumentUploads } from "./use-document-uploads"
import { cn } from "@/lib/utils"

export function DocumentsStep({ detail }: { detail: VisaApplicationDetail }) {
  const state = useDocumentUploads(detail)
  const current = { ...detail, documents: state.documents }
  const slots = getDocumentSlots(current)
  const missing = getMissingRequiredDocuments(current)
  const groups = [...new Set(slots.map((slot) => slot.travelerId))]
  const basePath = `/visa-assistance/applications/${detail.application.id}`
  return (
    <Card className={visaFormCard}>
      <VisaStepHeader
        step="documents"
        title="Supporting documents"
        description="Only the documents for your selected visa are shown here."
      />
      <CardContent className="flex flex-col gap-6">
        <VisaFormError message={state.pageError} />
        {slots.length ? (
          <Alert>
            <FileIcon aria-hidden="true" />
            <AlertTitle>Before you upload</AlertTitle>
            <AlertDescription>
              Use a clear PDF, JPG, or PNG up to 10 MB. Upload one file per
              requirement. You can replace it before submitting.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">
            No documents are required at this stage. Continue to review your
            request.
          </p>
        )}
        {groups.map((travelerId) => {
          const group = slots.filter((slot) => slot.travelerId === travelerId)
          return (
            <section
              key={travelerId ?? "shared"}
              className="overflow-hidden rounded-[22px] border border-primary/10 bg-primary/[0.035]"
            >
              <h2 className="border-b border-primary/10 bg-white px-5 py-4 font-medium">
                {group[0].travelerLabel}
              </h2>
              <div
                className={cn(
                  "grid gap-3 p-4",
                  group.length > 1 && "sm:grid-cols-2"
                )}
              >
                {group.map((slot) => (
                  <DocumentUploadCard
                    key={slot.key}
                    applicationId={detail.application.id}
                    option={slot.requirement}
                    documents={state.documents.filter(
                      (doc) =>
                        (doc.status === "uploaded" ||
                          doc.status === "deletion_pending") &&
                        doc.requirementId === slot.requirement.id &&
                        doc.travelerId === slot.travelerId
                    )}
                    uploadState={state.uploads[slot.key]}
                    deletingId={state.deletingId}
                    busy={state.busy}
                    onUpload={(file) => state.upload(slot, file)}
                    onDelete={state.remove}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </CardContent>
      <CardFooter className={`flex-col items-stretch gap-3 ${visaFormFooter}`}>
        <VisaFormActions
          backHref={`${basePath}/contact`}
          nextHref={`${basePath}/review`}
          isPending={state.busy}
          disabled={state.busy || missing.length > 0}
        />
        {missing.length > 0 ? (
          <p className="text-right text-xs text-muted-foreground">
            Add {missing.length} required{" "}
            {missing.length === 1 ? "file" : "files"} to continue.
          </p>
        ) : null}
      </CardFooter>
    </Card>
  )
}
