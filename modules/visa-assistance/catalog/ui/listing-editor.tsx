"use client"

import { useState } from "react"
import { EyeIcon, SaveIcon, SendIcon } from "lucide-react"
import { FormProvider, useWatch } from "react-hook-form"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AdminLinkButton } from "@/modules/admin/ui/admin-link-button"
import { EMPTY_LISTING_VALUES } from "@/modules/visa-assistance/catalog/domain/form-values"
import type {
  ParsedVisaListingInput,
  VisaListingInput,
} from "@/modules/visa-assistance/catalog/domain/listing"
import { ListingDetailsSection } from "./form/details-section"
import { ListingDocumentsSection } from "./form/documents-section"
import { ListingFeesSection } from "./form/fees-section"
import { ListingPreviewDialog } from "./form/preview-dialog"
import {
  ListingPublishReadiness,
  listingFormPublishIssues,
} from "./form/publish-readiness"
import { ListingRouteSection } from "./form/route-section"
import { useListingEditor } from "./form/use-listing-editor"
import { UnpublishListingButton } from "./unpublish-button"

export function VisaListingEditor({
  id,
  initialValues,
  initialStatus = "draft",
  duplicated = false,
  justSaved = false,
}: {
  id?: string
  initialValues: ParsedVisaListingInput
  initialStatus?: "draft" | "published"
  duplicated?: boolean
  justSaved?: boolean
}) {
  const editor = useListingEditor({ id, initialValues, initialStatus })
  const [previewMode, setPreviewMode] = useState<"preview" | "publish" | null>(
    null
  )
  const watched = useWatch({ control: editor.form.control })
  const values: VisaListingInput = {
    ...EMPTY_LISTING_VALUES,
    ...watched,
    documents: (watched.documents ?? []).map((document) => ({
      id: document?.id,
      label: document?.label ?? "",
      instructions: document?.instructions ?? "",
      required: document?.required ?? true,
      scope: document?.scope ?? "per_traveler",
    })),
  }
  const issues = listingFormPublishIssues(values)
  const feedback =
    editor.feedback ??
    (justSaved ? { error: false, message: "Visa listing saved." } : null)

  return (
    <FormProvider {...editor.form}>
      <form
        onSubmit={editor.submit("save")}
        noValidate
        className="flex flex-col gap-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AdminLinkButton
            href="/admin/visa-listings"
            variant="ghost"
            size="sm"
          >
            Back to visa listings
          </AdminLinkButton>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {editor.form.formState.isDirty
                ? "Unsaved changes"
                : id
                  ? "All changes saved"
                  : "Not saved yet"}
            </span>
            <Badge
              variant={editor.status === "published" ? "default" : "secondary"}
            >
              {editor.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>
        {feedback ? (
          <Alert
            variant={feedback.error ? "destructive" : "default"}
            role={feedback.error ? "alert" : "status"}
          >
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        ) : null}
        {duplicated ? (
          <Alert>
            <AlertTitle>Copied into a new draft</AlertTitle>
            <AlertDescription>
              Review the copied details, enter a new unique visa code, and
              confirm the document checklist before publishing.
            </AlertDescription>
          </Alert>
        ) : null}
        {editor.status === "published" ? (
          <Alert>
            <AlertDescription>
              Changes to this listing apply to new visa requests. Keep all
              publishing requirements complete when saving changes.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <fieldset
            disabled={editor.isPending}
            aria-busy={editor.isPending}
            className="flex min-w-0 flex-col gap-6"
          >
            <legend className="sr-only">Visa listing details</legend>
            <ListingRouteSection />
            <ListingDetailsSection />
            <ListingFeesSection />
            <ListingDocumentsSection />
          </fieldset>
          <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
            <ListingPublishReadiness issues={issues} />
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={editor.isPending}
              onClick={() => setPreviewMode("preview")}
            >
              <EyeIcon data-icon="inline-start" />
              Customer preview
            </Button>
            {id && editor.status === "published" ? (
              <UnpublishListingButton
                id={id}
                disabled={editor.isPending}
                onDone={() => editor.setStatus("draft")}
              />
            ) : null}
          </aside>
        </div>
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            {editor.isPending
              ? "Saving your changes…"
              : "Save your draft, or preview and publish when ready."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="outline"
              size="lg"
              disabled={editor.isPending}
            >
              {editor.isPending && editor.pendingIntent === "save" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {editor.isPending && editor.pendingIntent === "save"
                ? "Saving…"
                : editor.status === "published"
                  ? "Save changes"
                  : "Save draft"}
            </Button>
            {editor.status === "draft" ? (
              <Button
                type="button"
                size="lg"
                disabled={editor.isPending || issues.length > 0}
                onClick={() => setPreviewMode("publish")}
              >
                {editor.isPending && editor.pendingIntent === "publish" ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SendIcon data-icon="inline-start" />
                )}
                {editor.isPending && editor.pendingIntent === "publish"
                  ? "Publishing…"
                  : "Preview and publish"}
              </Button>
            ) : null}
          </div>
        </div>
        <ListingPreviewDialog
          values={values}
          mode={previewMode}
          onClose={() => setPreviewMode(null)}
          onPublish={() => {
            setPreviewMode(null)
            void editor.submit("publish")()
          }}
        />
      </form>
    </FormProvider>
  )
}
