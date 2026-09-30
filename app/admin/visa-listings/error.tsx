"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function VisaCatalogError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Alert variant="destructive">
        <AlertTitle>Could not load the visa catalog</AlertTitle>
        <AlertDescription>
          Please try again. Your saved listings have not changed.
        </AlertDescription>
      </Alert>
      <Button size="lg" className="w-fit" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
