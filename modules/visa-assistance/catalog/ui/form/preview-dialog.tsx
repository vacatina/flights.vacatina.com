"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { formatSerializedMoney } from "@/modules/currency/domain/money"
import type { VisaListingInput } from "@/modules/visa-assistance/catalog/domain/listing"
import {
  getListingEstimate,
  parseListingFee,
} from "@/modules/visa-assistance/catalog/domain/money"
import { ListingCountryLabel } from "../country-label"

const facts = [
  ["processingTimeText", "Processing time"],
  ["validityText", "Validity"],
  ["maxStayText", "Maximum stay"],
  ["entriesText", "Entries"],
  ["passportValidityText", "Passport validity"],
] as const

export function ListingPreviewDialog({
  values,
  mode,
  onClose,
  onPublish,
}: {
  values: VisaListingInput
  mode: "preview" | "publish" | null
  onClose: () => void
  onPublish: () => void
}) {
  let fees = null
  try {
    fees = getListingEstimate({
      feeCurrency: values.feeCurrency ?? null,
      priceMinor: parseListingFee(values.price, values.feeCurrency ?? null),
    })
  } catch {
    /* A draft can be previewed before its fee fields are valid. */
  }

  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customer preview</DialogTitle>
          <DialogDescription>
            Review the visa details, estimated price, and upload checklist.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {values.nationalityCode ? (
                <ListingCountryLabel code={values.nationalityCode} />
              ) : (
                "Passport country"
              )}
              <span aria-hidden="true">→</span>
              {values.destinationCode ? (
                <ListingCountryLabel code={values.destinationCode} />
              ) : (
                "Destination"
              )}
            </div>
            <h2 className="font-heading text-2xl font-semibold">
              {values.title || "Visa name"}
            </h2>
            <p className="text-muted-foreground">
              {values.shortSummary ||
                "Add a short summary to introduce this visa."}
            </p>
          </div>
          <p className="whitespace-pre-line">
            {values.fullDescription ||
              "Your full description will appear here."}
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            {facts
              .filter(([key]) => values[key]?.trim())
              .map(([key, label]) => (
                <div key={key}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-medium whitespace-pre-line">
                    {values[key]}
                  </dd>
                </div>
              ))}
          </dl>
          {[
            ["eligibilityNotes", "Eligibility"],
            ["additionalNotes", "Additional information"],
          ].map(([key, label]) => {
            const text = values[key as "eligibilityNotes" | "additionalNotes"]
            return text?.trim() ? (
              <section key={key} className="flex flex-col gap-2">
                <h3 className="font-medium">{label}</h3>
                <p className="whitespace-pre-line text-muted-foreground">
                  {text}
                </p>
              </section>
            ) : null
          })}
          <Separator />
          <section className="flex flex-col gap-3">
            <h3 className="font-medium">Documents to prepare</h3>
            {values.documents.length ? (
              <ul className="flex flex-col gap-4">
                {values.documents.map((document, index) => (
                  <li
                    key={document.id ?? index}
                    className="flex flex-col gap-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {document.label || `Document ${index + 1}`}
                      </span>
                      <Badge
                        variant={document.required ? "secondary" : "outline"}
                      >
                        {document.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {document.scope === "per_application"
                        ? "Once per request"
                        : "For each traveler"}
                    </span>
                    {document.instructions ? (
                      <p className="text-sm whitespace-pre-line">
                        {document.instructions}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                No document uploads required.
              </p>
            )}
          </section>
          <Separator />
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">Price per traveler</h3>
            <dl className="flex flex-col gap-2">
              <div className="flex justify-between gap-4 font-semibold">
                <dt>Estimated total</dt>
                <dd>{fees ? formatSerializedMoney(fees) : "Not entered"}</dd>
              </div>
            </dl>
            <p className="text-sm text-muted-foreground">
              No payment is required when submitting a request. Our team will
              confirm the final quote.
            </p>
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Back to editor
          </Button>
          {mode === "publish" ? (
            <Button type="button" size="lg" onClick={onPublish}>
              Confirm and publish
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
