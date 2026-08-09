"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { PlaneIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export default function ResultsSegmentLoading() {
  const [started, setStarted] = useState(false)
  const pathname = usePathname()

  let loadingText = "Loading..."
  if (pathname.includes("/fare-options")) {
    loadingText = "Finding the best flights..."
  } else if (pathname.includes("/review")) {
    loadingText = "Preparing your flight summary..."
  } else if (pathname.includes("/checkout")) {
    loadingText = "Setting up checkout..."
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setStarted(true)
    }, 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-100px)] w-full max-w-4xl flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <p className="text-xl font-medium text-foreground">
          {loadingText}
        </p>

        <div className="relative h-1.5 w-full rounded-full bg-muted">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-primary",
              started ? "w-[95%] duration-[5000ms] ease-[cubic-bezier(0,0.5,0.05,1)]" : "w-0 duration-0"
            )}
            style={{ transitionProperty: "width" }}
          >
            <div className="absolute right-0 top-1/2 flex items-center justify-center">
              <PlaneIcon 
                fill="currentColor"
                className="size-6 -translate-y-1/2 translate-x-1/2 rotate-45 animate-pulse text-primary drop-shadow-md"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
