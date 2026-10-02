"use client"

import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react"
import { Controller, useFormContext, useWatch } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { VisaListingInput } from "@/modules/visa-assistance/catalog/domain/listing"

export function ListingDocumentRow({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
}) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<VisaListingInput>()
  const document = useWatch({ control, name: `documents.${index}` })
  const error = errors.documents?.[index]
  const invalidateReview = () =>
    setValue("documentsReviewed", false, { shouldDirty: true })
  const prefix = `document-${index}`

  return (
    <FieldSet className="rounded-lg border p-4">
      <FieldLegend variant="label">Document {index + 1}</FieldLegend>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="outline">
          {document?.scope === "per_application"
            ? "Once per request"
            : "Each traveler"}
        </Badge>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Move document ${index + 1} up`}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Move document ${index + 1} down`}
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            aria-label={`Remove document ${index + 1}`}
            onClick={() => onRemove(index)}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <FieldGroup>
        <Field data-invalid={Boolean(error?.label)}>
          <FieldLabel htmlFor={`${prefix}-label`}>Document name</FieldLabel>
          <Input
            id={`${prefix}-label`}
            placeholder="Passport bio page"
            maxLength={120}
            aria-invalid={Boolean(error?.label)}
            {...register(`documents.${index}.label`, {
              onChange: invalidateReview,
            })}
          />
          <FieldError errors={[error?.label]} />
        </Field>
        <Field data-invalid={Boolean(error?.instructions)}>
          <FieldLabel htmlFor={`${prefix}-instructions`}>
            Upload instructions (optional)
          </FieldLabel>
          <Textarea
            id={`${prefix}-instructions`}
            placeholder="Upload a clear, full-page copy with all text visible."
            maxLength={1000}
            aria-invalid={Boolean(error?.instructions)}
            {...register(`documents.${index}.instructions`, {
              onChange: invalidateReview,
            })}
          />
          <FieldError errors={[error?.instructions]} />
        </Field>
        <Controller
          name={`documents.${index}.scope`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id={`${prefix}-scope`}>Who uploads this?</FieldLabel>
              <ToggleGroup
                variant="outline"
                spacing={1}
                value={[field.value]}
                aria-labelledby={`${prefix}-scope`}
                onValueChange={(values) => {
                  if (!values[0]) return
                  field.onChange(values[0])
                  invalidateReview()
                }}
              >
                <ToggleGroupItem value="per_traveler">
                  Each traveler
                </ToggleGroupItem>
                <ToggleGroupItem value="per_application">
                  Once per request
                </ToggleGroupItem>
              </ToggleGroup>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name={`documents.${index}.required`}
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id={`${prefix}-required`}
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked)
                  invalidateReview()
                }}
              />
              <FieldLabel htmlFor={`${prefix}-required`}>
                Required before submission
              </FieldLabel>
            </Field>
          )}
        />
        <FieldDescription>
          Customer sees: <strong>{document?.label || "Document name"}</strong>
          {" · "}
          {document?.required ? "Required" : "Optional"}
          {" · "}
          {document?.scope === "per_application"
            ? "One file for the request"
            : "One file per traveler"}
        </FieldDescription>
      </FieldGroup>
    </FieldSet>
  )
}
