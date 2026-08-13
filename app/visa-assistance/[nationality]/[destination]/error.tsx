"use client"

import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function VisaDetailsError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-[60svh] items-center justify-center bg-muted/40 px-5 py-16">
      <Empty className="max-w-xl border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangleIcon />
          </EmptyMedia>
          <EmptyTitle>Visa details are temporarily unavailable</EmptyTitle>
          <EmptyDescription>
            We couldn’t check this trip right now. Please wait a moment and try
            again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={reset}>
            <RotateCcwIcon data-icon="inline-start" />
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
