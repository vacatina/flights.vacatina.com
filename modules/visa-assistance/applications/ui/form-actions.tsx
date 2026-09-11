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
    <div className="flex flex-col-reverse justify-between gap-3 border-t pt-6 sm:flex-row">
      {backHref ? (
        <Button
          variant="ghost"
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
          nativeButton={false}
          render={<Link href={nextHref} />}
          disabled={disabled}
        >
          <ArrowRightIcon data-icon="inline-end" />
          {label}
        </Button>
      ) : (
        <Button
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
