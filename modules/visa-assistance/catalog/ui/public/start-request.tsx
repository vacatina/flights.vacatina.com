"use client"

import { useState, useTransition } from "react"
import { unstable_rethrow } from "next/navigation"
import { LoadingButton } from "@/components/ui/loading-button"
import { createVisaApplicationDraftAction } from "@/modules/visa-assistance/applications/server/actions/create-draft"

export function StartVisaRequest({ listingId }: { listingId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null)
          try {
            const result = await createVisaApplicationDraftAction(formData)
            if (result && !result.ok) setError(result.message)
          } catch (error) {
            unstable_rethrow(error)
            setError("We couldn't start your request. Please try again.")
          }
        })
      }
    >
      <input type="hidden" name="listingId" value={listingId} />
      <LoadingButton
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending}
        isLoading={pending}
        aria-busy={pending}
      >
        Start visa request
      </LoadingButton>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
