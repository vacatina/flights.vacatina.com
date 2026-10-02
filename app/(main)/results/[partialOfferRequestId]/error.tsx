"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function ResultsSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[results/error]", error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-screen-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">
        We could not load these flight results
      </h1>
      <p className="text-base text-muted-foreground">
        The search may have expired or there may be a temporary issue.
      </p>
      <Button onClick={reset}>Retry</Button>
    </main>
  )
}
