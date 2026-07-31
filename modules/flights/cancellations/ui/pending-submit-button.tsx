"use client"

import { useFormStatus } from "react-dom"
import { LoaderCircleIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

interface PendingSubmitButtonProps
  extends VariantProps<typeof buttonVariants> {
  children: ReactNode
  pendingLabel?: string
  className?: string
  disabled?: boolean
}

export function PendingSubmitButton({
  children,
  pendingLabel = "Working...",
  className,
  disabled = false,
  variant = "default",
  size = "default",
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
    >
      {pending ? (
        <>
          <LoaderCircleIcon className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
