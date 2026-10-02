"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { unpublishVisaListingAction } from "@/modules/visa-assistance/catalog/server/actions"

export function UnpublishListingButton({
  id,
  disabled,
  onDone,
}: {
  id: string
  disabled?: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function unpublish() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await unpublishVisaListingAction(id)
        if (!result.ok) {
          setError(result.message)
          return
        }
        setOpen(false)
        onDone?.()
        router.refresh()
      } catch {
        setError("Could not unpublish this listing. Please try again.")
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || pending}
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        Unpublish
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value)
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Unpublish this visa listing?</DialogTitle>
            <DialogDescription>
              This changes the listing to a draft and removes it from public
              search. You can edit and publish it again later.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Keep published
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={pending}
              onClick={unpublish}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Unpublishing…" : "Unpublish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
