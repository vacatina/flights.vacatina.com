"use client"

import { useEffect } from "react"
import { z } from "zod"
import type { UseFormReturn } from "react-hook-form"

import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"

const checkoutDraftSchema = z.object({
  paymentMode: z.enum(["pay_now", "hold"]).optional(),
  ancillarySelection: z
    .object({
      services: z
        .array(
          z.object({
            id: z.string().trim().min(1),
            quantity: z.number().int().positive().max(9),
          }).strict()
        )
        .optional(),
    })
    .strict()
    .optional(),
}).strict()

type CheckoutSafeDraft = z.infer<typeof checkoutDraftSchema>

export function useCheckoutDraftPersistence(input: {
  form: UseFormReturn<CheckoutFormValues>
  draftKey: string
  enabled: boolean
}) {
  useEffect(() => {
    if (!input.enabled || typeof window === "undefined") {
      return
    }

    const raw = window.sessionStorage.getItem(input.draftKey)
    if (!raw) {
      return
    }

    try {
      const parsed = checkoutDraftSchema.safeParse(JSON.parse(raw))

      if (!parsed.success) {
        window.sessionStorage.removeItem(input.draftKey)
        return
      }

      hydrateSafeDraft(input.form, parsed.data)
    } catch {
      window.sessionStorage.removeItem(input.draftKey)
    }
  }, [input.draftKey, input.enabled, input.form])

  useEffect(() => {
    if (!input.enabled || typeof window === "undefined") {
      return
    }

    const subscription = input.form.watch((value) => {
      window.sessionStorage.setItem(
        input.draftKey,
        JSON.stringify(extractSafeDraft(value as CheckoutFormValues))
      )
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [input.draftKey, input.enabled, input.form])

  function clearDraft() {
    if (typeof window === "undefined") {
      return
    }

    window.sessionStorage.removeItem(input.draftKey)
  }

  return {
    clearDraft,
  }
}

function extractSafeDraft(values: CheckoutFormValues): CheckoutSafeDraft {
  return {
    paymentMode: values.paymentMode,
    ancillarySelection: {
      services: values.ancillarySelection.services.map((service) => ({
        id: service.id,
        quantity: service.quantity,
      })),
    },
  }
}

function hydrateSafeDraft(
  form: UseFormReturn<CheckoutFormValues>,
  draft: CheckoutSafeDraft
) {
  const nextValues = form.getValues()

  if (draft.paymentMode) {
    nextValues.paymentMode = draft.paymentMode
  }

  if (draft.ancillarySelection?.services) {
    nextValues.ancillarySelection = {
      ...nextValues.ancillarySelection,
      services: draft.ancillarySelection.services.map((service) => ({
        id: service.id,
        quantity: service.quantity,
      })),
    }
  }

  form.reset(nextValues)
}
