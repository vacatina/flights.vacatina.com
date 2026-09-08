"use client"

import { useSyncExternalStore } from "react"

const VIDEO_ID = "bSBRo4Hnfak"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener("change", onChange)
  return () => mediaQuery.removeEventListener("change", onChange)
}

function readReducedMotionPreference() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function readServerReducedMotionPreference() {
  return true
}

export function HeroVideoBackground() {
  const shouldReduceMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotionPreference,
    readServerReducedMotionPreference
  )

  if (shouldReduceMotion) {
    return null
  }

  const videoUrl = new URL(`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`)
  videoUrl.searchParams.set("autoplay", "1")
  videoUrl.searchParams.set("mute", "1")
  videoUrl.searchParams.set("controls", "0")
  videoUrl.searchParams.set("loop", "1")
  videoUrl.searchParams.set("playlist", VIDEO_ID)
  videoUrl.searchParams.set("playsinline", "1")
  videoUrl.searchParams.set("disablekb", "1")
  videoUrl.searchParams.set("fs", "0")
  videoUrl.searchParams.set("iv_load_policy", "3")
  videoUrl.searchParams.set("rel", "0")

  return (
    <iframe
      src={videoUrl.toString()}
      title="Airplane wing above the clouds"
      aria-hidden="true"
      tabIndex={-1}
      allow="autoplay; encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
      className="pointer-events-none absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
    />
  )
}
