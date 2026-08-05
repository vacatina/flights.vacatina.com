"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { PlaneIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean
  isError?: boolean
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ className, isLoading = false, isError = false, children, disabled, ...props }, ref) => {
    const [phase, setPhase] = useState<"idle" | "loading" | "complete">("idle")

    useEffect(() => {
      if (isLoading) {
        setPhase("loading")
      } else if (phase === "loading") {
        if (isError) {
          setPhase("idle")
        } else {
          setPhase("complete")
          const t = setTimeout(() => {
            setPhase("idle")
          }, 500)
          return () => clearTimeout(t)
        }
      }
    }, [isLoading, isError, phase])

    return (
      <Button
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        disabled={disabled || phase !== "idle"}
        {...props}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 bg-black/20 dark:bg-white/20",
            phase === "loading" && "w-[95%] duration-[5000ms] ease-[cubic-bezier(0,0.5,0.05,1)]",
            phase === "complete" && "w-full duration-[300ms] ease-out",
            phase === "idle" && "w-0 duration-0"
          )}
          style={{ transitionProperty: "width" }}
        >
          {(phase === "loading" || phase === "complete") && (
            <PlaneIcon 
              fill="currentColor"
              className={cn(
                "absolute right-3 top-1/2 rotate-45 -translate-y-1/2 size-4 opacity-80",
                phase === "loading" && "animate-pulse"
              )} 
            />
          )}
        </div>

        {/* Content */}
        <span className={cn("relative z-10 flex items-center justify-center transition-opacity duration-200", phase !== "idle" && "opacity-0")}>
          {children}
        </span>
      </Button>
    )
  }
)
LoadingButton.displayName = "LoadingButton"
