"use client"

import { BanIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { createAdminCancellationRequestFormAction } from "@/modules/flights/cancellations/server/actions"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"

interface AdminCancelBookingDialogProps {
  bookingReference: string
  routeLabel: string
  customerEmail: string
}

export function AdminCancelBookingDialog({
  bookingReference,
  routeLabel,
  customerEmail,
}: AdminCancelBookingDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive">
            <BanIcon data-icon="inline-start" />
            Cancel booking
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start cancellation for {bookingReference}?</DialogTitle>
          <DialogDescription>
            This creates a cancellation case for {routeLabel} and notifies{" "}
            {customerEmail}. Airline cancellation and any refund still require
            review in the case.
          </DialogDescription>
        </DialogHeader>

        <form
          action={createAdminCancellationRequestFormAction}
          className="flex flex-col gap-5"
        >
          <input
            type="hidden"
            name="bookingReference"
            value={bookingReference}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="admin-cancellation-reason">
                Reason
              </FieldLabel>
              <Textarea
                id="admin-cancellation-reason"
                name="reason"
                minLength={10}
                maxLength={2000}
                required
                placeholder="Explain why this booking is being cancelled."
                className="min-h-28"
              />
              <FieldDescription>
                Saved in the cancellation case and included in the audit
                history.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Keep booking
            </DialogClose>
            <PendingSubmitButton
              variant="destructive"
              pendingLabel="Starting cancellation…"
            >
              Create cancellation case
            </PendingSubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
