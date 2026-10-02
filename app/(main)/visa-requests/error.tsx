"use client"

import { useTransition } from "react"
import { AlertCircleIcon } from "lucide-react"

import { CustomerDashboardHeader } from "@/components/customer-dashboard/customer-dashboard-header"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

export default function VisaRequestsError({ reset }: { reset: () => void }) {
  const [isPending, startTransition] = useTransition()

  return (
    <main className="min-h-svh bg-muted/40 py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 md:px-8">
        <CustomerDashboardHeader activeSection="visa-requests" />
        <Empty className="bg-card ring-1 ring-foreground/10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircleIcon />
            </EmptyMedia>
            <EmptyTitle>We could not load your visa requests</EmptyTitle>
            <EmptyDescription>
              Your saved requests are safe. Check your connection and try again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="lg"
              disabled={isPending}
              aria-busy={isPending}
              onClick={() => startTransition(reset)}
            >
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? "Trying again..." : "Try again"}
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </main>
  )
}
