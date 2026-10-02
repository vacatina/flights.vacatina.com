import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

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
      {backHref && !isPending ? (
        <Link
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 w-full rounded-xl px-5 sm:w-auto"
          )}
          href={backHref}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Link>
      ) : backHref ? (
        <Button
          className="h-12 w-full rounded-xl px-5 sm:w-auto"
          variant="outline"
          disabled
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
      ) : (
        <span />
      )}
      {nextHref && !disabled && !isPending ? (
        <Link
          className={cn(
            buttonVariants(),
            "h-12 w-full rounded-xl px-6 shadow-lg shadow-primary/15 sm:w-auto"
          )}
          href={nextHref}
        >
          <ArrowRightIcon data-icon="inline-end" />
          {label}
        </Link>
      ) : (
        <Button
          className="h-12 w-full rounded-xl px-6 shadow-lg shadow-primary/15 sm:w-auto"
          type={nextHref ? "button" : "submit"}
          disabled={disabled || isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
          {isPending ? (nextHref ? "Working..." : "Saving...") : label}
        </Button>
      )}
    </div>
  )
}
