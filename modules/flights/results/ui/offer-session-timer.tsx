"use client"

import Link from "next/link"
import { memo, useEffect, useMemo, useState } from "react"
import { AlertCircleIcon, Clock3Icon, RefreshCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const OFFER_EXPIRY_WARNING_MS = 5 * 60 * 1000

export function OfferSessionTimer(input: {
  expiresAtIso: string | null
  expiresAtLabel: string | null
  compact?: boolean
}) {
  const countdown = useOfferCountdown(input.expiresAtIso)

  if (!input.expiresAtIso) {
    return null
  }

  const expired = countdown.remainingMs <= 0
  const expiringSoon =
    countdown.remainingMs > 0 && countdown.remainingMs <= OFFER_EXPIRY_WARNING_MS

  if (input.compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
          expired
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : expiringSoon
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-[#d7d8ce] bg-white text-[#66706b]"
        )}
      >
        {expired ? <AlertCircleIcon className="size-4" /> : <Clock3Icon className="size-4" />}
        <span className="font-medium">{expired ? "Session expired" : "Session timeout"}</span>
        {!expired ? <AnimatedCountdown remainingMs={countdown.remainingMs} /> : null}
      </div>
    )
  }

  return (
    <section
      className={cn(
        "rounded-lg border bg-white px-4 py-2.5 text-sm shadow-sm",
        expired
          ? "border-destructive/30"
          : expiringSoon
            ? "border-amber-300 bg-amber-50"
            : "border-[#d7d8ce]"
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              expired ? "bg-destructive/10 text-destructive" : "bg-[#f2f3ee] text-[#47524d]"
            )}
          >
            {expired ? <AlertCircleIcon className="size-4" /> : <Clock3Icon className="size-4" />}
          </div>
          <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {expired ? "Session expired" : "Session timeout"}
              </p>
              {!expired ? <AnimatedCountdown remainingMs={countdown.remainingMs} /> : null}
            </div>
            <p className="truncate text-muted-foreground">
              {expired
                ? "Start a new search to refresh availability."
                : `Fares held until ${input.expiresAtLabel ?? "expiry"}.`}
            </p>
          </div>
        </div>
        {expired ? (
          <Button className="h-9 px-4" nativeButton={false} render={<Link href="/" />}>
            <RefreshCcwIcon data-icon="inline-start" />
            Start new search
          </Button>
        ) : null}
      </div>
    </section>
  )
}

export function useOfferSessionExpiry(expiresAtIso: string | null) {
  const countdown = useOfferCountdown(expiresAtIso)

  return {
    remainingMs: countdown.remainingMs,
    expired: Boolean(expiresAtIso) && countdown.remainingMs <= 0,
    expiringSoon:
      Boolean(expiresAtIso) &&
      countdown.remainingMs > 0 &&
      countdown.remainingMs <= OFFER_EXPIRY_WARNING_MS,
    label: countdown.label,
  }
}

function useOfferCountdown(expiresAtIso: string | null) {
  const expiresAtMs = useMemo(() => {
    if (!expiresAtIso) {
      return Number.POSITIVE_INFINITY
    }

    const parsed = Date.parse(expiresAtIso)
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
  }, [expiresAtIso])
  const [remainingMs, setRemainingMs] = useState(Number.POSITIVE_INFINITY)

  useEffect(() => {
    function updateRemaining() {
      setRemainingMs(Math.max(0, expiresAtMs - Date.now()))
    }

    updateRemaining()

    const intervalId = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(intervalId)
  }, [expiresAtMs])

  return {
    remainingMs,
    label: formatDurationLabel(remainingMs),
  }
}

const RollingNumber = memo(function RollingNumber(input: {
  value: number
  padStart?: boolean
}) {
  const digits = String(input.value).padStart(input.padStart ? 2 : 1, "0")

  return (
    <span className="inline-flex items-center tabular-nums">
      {digits.split("").map((digit, index) => (
        <RollingDigit key={`${index}-${digits.length}`} digit={Number(digit)} />
      ))}
    </span>
  )
})

function RollingDigit(input: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden leading-none">
      <span
        className="absolute left-0 top-0 flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${input.digit}em)` }}
      >
        {Array.from({ length: 10 }, (_, digit) => (
          <span key={digit} className="h-[1em] leading-none">
            {digit}
          </span>
        ))}
      </span>
      <span className="invisible">0</span>
    </span>
  )
}

function AnimatedCountdown(input: { remainingMs: number }) {
  if (!Number.isFinite(input.remainingMs) || input.remainingMs <= 0) {
    return null
  }

  const totalSeconds = Math.ceil(input.remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return (
    <span className="inline-flex items-center rounded-md bg-[#f6f7f4] px-2 py-1 font-medium tabular-nums text-[#17201d]">
      {hours > 0 ? (
        <>
          <RollingNumber value={hours} />
          <span className="mx-0.5">:</span>
        </>
      ) : null}
      <RollingNumber value={minutes} padStart={hours > 0} />
      <span className="mx-0.5">:</span>
      <RollingNumber value={seconds} padStart />
    </span>
  )
}

function formatDurationLabel(ms: number) {
  if (!Number.isFinite(ms)) {
    return "--"
  }

  if (ms <= 0) {
    return "expired"
  }

  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
