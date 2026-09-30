"use client"

import { useEffect, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm, type FieldPath } from "react-hook-form"

import {
  visaListingInputSchema,
  type ParsedVisaListingInput,
  type VisaListingInput,
} from "@/modules/visa-assistance/catalog/domain/listing"
import { saveVisaListingAction } from "@/modules/visa-assistance/catalog/server/actions"

export function useListingEditor({
  id,
  initialValues,
  initialStatus,
}: {
  id?: string
  initialValues: ParsedVisaListingInput
  initialStatus: "draft" | "published"
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingIntent, setPendingIntent] = useState<"save" | "publish">("save")
  const [status, setStatus] = useState(initialStatus)
  const [feedback, setFeedback] = useState<{
    error: boolean
    message: string
  } | null>(null)
  const form = useForm<VisaListingInput, undefined, ParsedVisaListingInput>({
    resolver: zodResolver(visaListingInputSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  })
  const dirty = form.formState.isDirty

  useEffect(() => {
    if (!dirty) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) =>
      event.preventDefault()
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [dirty])

  function submit(intent: "save" | "publish") {
    return form.handleSubmit(
      (values) => {
        setPendingIntent(intent)
        setFeedback(null)
        startTransition(async () => {
          try {
            const result = await saveVisaListingAction({ id, intent, values })
            if (!result.ok) {
              for (const error of result.fields) {
                if (error.path)
                  form.setError(error.path as FieldPath<VisaListingInput>, {
                    message: error.message,
                  })
              }
              setFeedback({ error: true, message: result.message })
              return
            }
            form.reset(result.data.values)
            setStatus(result.data.status)
            setFeedback({
              error: false,
              message:
                intent === "publish"
                  ? "Visa listing published."
                  : "Changes saved.",
            })
            if (!id)
              router.replace(`/admin/visa-listings/${result.data.id}?saved=1`)
            else router.refresh()
          } catch {
            setFeedback({
              error: true,
              message:
                "Could not save the listing. Your entries are still here; please try again.",
            })
          }
        })
      },
      () =>
        setFeedback({
          error: true,
          message: "Check the highlighted fields and try again.",
        })
    )
  }

  return { form, isPending, pendingIntent, status, setStatus, feedback, submit }
}
