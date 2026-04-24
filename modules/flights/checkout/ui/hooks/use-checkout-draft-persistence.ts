"use client"

import { useEffect } from "react"
import type { UseFormReturn } from "react-hook-form"

import type { CheckoutFormValues } from "@/modules/flights/checkout/ui/checkout-form-values"

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
      const parsed = JSON.parse(raw) as Partial<CheckoutFormValues>
      input.form.reset({
        ...input.form.getValues(),
        ...parsed,
      })
    } catch {
      window.sessionStorage.removeItem(input.draftKey)
    }
  }, [input.draftKey, input.enabled, input.form])

  useEffect(() => {
    if (!input.enabled || typeof window === "undefined") {
      return
    }

    const subscription = input.form.watch((value) => {
      window.sessionStorage.setItem(input.draftKey, JSON.stringify(value))
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

