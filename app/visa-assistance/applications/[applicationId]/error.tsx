"use client"

import { AlertCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function VisaApplicationError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="w-full mx-auto flex min-h-[60svh] max-w-screen-2xl items-center px-4">
      <div className="w-full rounded-xl border bg-card p-6 text-center">
        <AlertCircleIcon className="mx-auto size-8 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">
          We could not load this visa request
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again. Your saved information has not been removed.
        </p>
        <Button className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  )
}
