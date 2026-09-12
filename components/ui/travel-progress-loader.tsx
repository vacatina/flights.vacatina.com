"use client"

import { useEffect, useState } from "react"
import { PlaneIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface TravelProgressLoaderProps {
  message: string
  description?: string
}

export function TravelProgressLoader({
  message,
  description,
}: TravelProgressLoaderProps) {
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setStarted(true), 50)
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-xl font-medium text-balance text-foreground">
          {message}
        </p>
        {description ? (
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <div
        className="relative h-1.5 w-full rounded-full bg-muted"
        role="progressbar"
        aria-label={message}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-primary",
            started
              ? "w-[95%] duration-[5000ms] ease-[cubic-bezier(0,0.5,0.05,1)]"
              : "w-0 duration-0"
          )}
          style={{ transitionProperty: "width" }}
        >
          <PlaneIcon
            fill="currentColor"
            className="absolute top-1/2 right-0 size-6 translate-x-1/2 -translate-y-1/2 rotate-45 animate-pulse text-primary drop-shadow-md motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}
