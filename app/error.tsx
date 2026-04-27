"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app/error]", error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-3xl font-semibold md:text-2xl">
        Something went wrong
      </h1>
      <p className="text-base text-muted-foreground">
        We could not load this page right now. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
