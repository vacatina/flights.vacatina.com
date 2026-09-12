"use client"

import { usePathname } from "next/navigation"

import { TravelProgressLoader } from "@/components/ui/travel-progress-loader"

export default function ResultsSegmentLoading() {
  const pathname = usePathname()

  let loadingText = "Loading..."
  if (pathname.includes("/fare-options")) {
    loadingText = "Finding the best flights..."
  } else if (pathname.includes("/review")) {
    loadingText = "Preparing your flight summary..."
  } else if (pathname.includes("/checkout")) {
    loadingText = "Setting up checkout..."
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-100px)] w-full max-w-4xl flex-col items-center justify-center px-6">
      <TravelProgressLoader message={loadingText} />
    </main>
  )
}
