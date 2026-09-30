"use client"

import { PlusIcon, FilesIcon } from "lucide-react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import type { VisaListingInput } from "@/modules/visa-assistance/catalog/domain/listing"
import { ListingDocumentRow } from "./document-row"

export function ListingDocumentsSection() {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<VisaListingInput>()
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "documents",
    keyName: "fieldKey",
  })
  const invalidateReview = () =>
    setValue("documentsReviewed", false, { shouldDirty: true })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Required documents</CardTitle>
        <CardDescription>
          Configure the uploads for this visa. Customers can upload PDF, JPG, or
          PNG files up to 10 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {!fields.length ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilesIcon />
                </EmptyMedia>
                <EmptyTitle>No documents configured</EmptyTitle>
                <EmptyDescription>
                  Add the documents you need, or confirm below that this visa
                  needs no uploads.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            fields.map((field, index) => (
              <ListingDocumentRow
                key={field.fieldKey}
                index={index}
                count={fields.length}
                onMove={(from, to) => {
                  move(from, to)
                  invalidateReview()
                }}
                onRemove={(position) => {
                  remove(position)
                  invalidateReview()
                }}
              />
            ))
          )}
          <FieldError errors={[errors.documents, errors.documents?.root]} />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-fit"
            disabled={fields.length >= 30}
            onClick={() => {
              append({
                label: "",
                instructions: "",
                required: true,
                scope: "per_traveler",
              })
              invalidateReview()
            }}
          >
            <PlusIcon data-icon="inline-start" />
            Add document
          </Button>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Controller
          name="documentsReviewed"
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id="documentsReviewed"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldLabel htmlFor="documentsReviewed">
                I have reviewed this checklist and confirmed it is complete.
              </FieldLabel>
            </Field>
          )}
        />
      </CardFooter>
    </Card>
  )
}
