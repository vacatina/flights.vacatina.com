"use client"

import { useFormContext } from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { VisaListingInput } from "@/modules/visa-assistance/catalog/domain/listing"

type TextFieldName = Exclude<
  keyof VisaListingInput,
  "documents" | "documentsReviewed"
>

export function ListingTextField({
  name,
  label,
  placeholder,
  description,
  multiline = false,
  maxLength,
}: {
  name: TextFieldName
  label: string
  placeholder: string
  description?: string
  multiline?: boolean
  maxLength?: number
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<VisaListingInput>()
  const error = errors[name]
  const props = {
    id: name,
    placeholder,
    maxLength,
    inputMode:
      name === "governmentFee" || name === "processingFee"
        ? ("decimal" as const)
        : ("text" as const),
    "aria-invalid": Boolean(error),
    "aria-describedby": error
      ? `${name}-error`
      : description
        ? `${name}-help`
        : undefined,
    ...register(name),
  }
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {multiline ? <Textarea {...props} rows={4} /> : <Input {...props} />}
      {description ? (
        <FieldDescription id={`${name}-help`}>{description}</FieldDescription>
      ) : null}
      <FieldError id={`${name}-error`} errors={[error]} />
    </Field>
  )
}
