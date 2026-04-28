import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type SpinnerSize = "sm" | "default" | "lg"

const spinnerSizeClasses: Record<SpinnerSize, string> = {
  sm: "size-3.5 border-[1.8px]",
  default: "size-4 border-2",
  lg: "size-5 border-2",
}

interface SpinnerProps extends ComponentProps<"span"> {
  size?: SpinnerSize
}

export function Spinner({ className, size = "default", ...props }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="spinner"
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        spinnerSizeClasses[size],
        className
      )}
      {...props}
    />
  )
}
