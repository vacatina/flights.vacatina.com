"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { HolidayPackage } from "../domain/types"

function EnquiryInput({
  id,
  label,
  type = "text",
  required = false,
  placeholder,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={
          type === "email"
            ? "email"
            : type === "tel"
              ? "tel"
              : id === "full-name"
                ? "name"
                : "off"
        }
      />
    </Field>
  )
}

export function HolidayEnquiry({ holiday }: { holiday: HolidayPackage }) {
  const [previewed, setPreviewed] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPreviewed(true)
  }
  return (
    <aside className="min-w-0 lg:sticky lg:top-[110px] lg:self-start">
      <form
        id="holiday-enquiry"
        onSubmit={submit}
        className="scroll-mt-28 rounded-2xl bg-card p-6 sm:p-7"
      >
        <FieldGroup className="gap-4">
          <FieldGroup className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <EnquiryInput
              id="full-name"
              label="Full name"
              required
              placeholder="Your full name"
            />
            <EnquiryInput
              id="phone"
              label="Phone"
              type="tel"
              placeholder="Phone number"
            />
            <EnquiryInput
              id="email"
              label="Email"
              type="email"
              required
              placeholder="you@example.com"
            />
            <EnquiryInput id="travel-date" label="Travel date" type="date" />
          </FieldGroup>
          <Field className="gap-2">
            <FieldLabel htmlFor="planned-package">Planned holiday</FieldLabel>
            <Input id="planned-package" value={holiday.title} readOnly />
          </Field>
          <Field className="gap-2">
            <FieldLabel htmlFor="message">Message*</FieldLabel>
            <Textarea
              id="message"
              name="message"
              required
              className="min-h-28"
              placeholder="Tell us your group size, preferred hotels and what you would love to experience."
            />
          </Field>
          <Button type="submit" size="lg" className="w-full rounded-full">
            {holiday.cta.label}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            UI preview · Enquiries are not sent.
          </p>
          {previewed && (
            <Alert role="status">
              <CheckCircle2 />
              <AlertTitle>Enquiry preview complete</AlertTitle>
              <AlertDescription>
                Your form is ready. This preview has not sent or saved your
                details.
              </AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </form>
      {holiday.price.note && (
        <p className="px-3 pt-4 text-center text-xs leading-relaxed text-muted-foreground">
          {holiday.price.note}
        </p>
      )}
    </aside>
  )
}
