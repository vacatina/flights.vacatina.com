"use client"

import type { ComponentProps, ReactNode } from "react"
import { useFormStatus } from "react-dom"
import type { VariantProps } from "class-variance-authority"

import { Button, type buttonVariants } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { Spinner } from "@/components/ui/spinner"

export interface PendingSubmitButtonProps
  extends
    VariantProps<typeof buttonVariants>,
    Omit<ComponentProps<typeof Button>, "children" | "variant" | "size"> {
  children: ReactNode
  pendingAnimation?: "spinner" | "flight-progress"
  pendingLabel?: string
}

export function PendingSubmitButton({
  children,
  pendingAnimation = "spinner",
  pendingLabel = "Working...",
  className,
  disabled = false,
  variant = "default",
  size = "default",
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus()
  const unavailable = disabled || pending

  if (pendingAnimation === "flight-progress") {
    return (
      <LoadingButton
        {...props}
        type="submit"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        isLoading={pending}
        aria-disabled={unavailable}
        aria-busy={pending}
      >
        {children}
      </LoadingButton>
    )
  }

  return (
    <Button
      {...props}
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={unavailable}
      aria-disabled={unavailable}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Spinner data-icon="inline-start" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
