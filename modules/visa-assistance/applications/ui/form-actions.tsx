import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function VisaFormActions({
  backHref,
  nextHref,
  isPending,
  label = "Save and continue",
  disabled = false,
}: {
  backHref?: string
  nextHref?: string
  isPending: boolean
  label?: string
  disabled?: boolean
}) {
  return (
    <div className="flex w-full flex-col-reverse justify-between gap-3 sm:flex-row">
      {backHref ? (
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          nativeButton={false}
          render={<Link href={backHref} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
      ) : (
        <span />
      )}
      {nextHref ? (
        <Button
          className="w-full sm:w-auto"
          nativeButton={false}
          render={<Link href={nextHref} />}
          disabled={disabled}
        >
          <ArrowRightIcon data-icon="inline-end" />
          {label}
        </Button>
      ) : (
        <Button
          className="w-full sm:w-auto"
          type="submit"
          disabled={disabled || isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
          {isPending ? "Saving..." : label}
        </Button>
      )}
    </div>
  )
}
