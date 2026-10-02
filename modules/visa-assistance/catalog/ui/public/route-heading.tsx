import Image from "next/image"
import { Compass, FileCheck2 } from "lucide-react"
import { VisaRouteTicket } from "./route-ticket"
import styles from "./visa-motion.module.css"
import { cn } from "@/lib/utils"

export function VisaRouteHeading({
  nationality,
  destination,
  title,
  description,
}: {
  nationality: string
  destination: string
  title: string
  description: string
}) {
  return (
    <header className="relative isolate overflow-hidden bg-brand-navy text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-24 -z-10 size-[650px] rounded-full bg-primary/30 blur-3xl"
      />
      <div className="mx-auto grid w-full max-w-screen-2xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16 lg:py-16">
        <div className="flex min-w-0 flex-col gap-6 duration-700 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3">
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-white/75 uppercase">
            <Compass className="size-4" aria-hidden="true" />
            Vacatina visa assistance
          </p>
          <h1 className="max-w-4xl font-heading text-4xl leading-[1.05] font-normal tracking-tight text-balance [overflow-wrap:anywhere] sm:text-5xl xl:text-[68px]">
            {title}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line text-white/75 sm:text-base">
            {description}
          </p>
          <VisaRouteTicket
            nationality={nationality}
            destination={destination}
          />
        </div>
        <div className="relative hidden min-w-0 pb-7 pl-6 lg:block">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 inset-y-7 rotate-3 rounded-[32px] border border-white/25 bg-white/5"
          />
          <div className="relative aspect-[1.12] overflow-hidden rounded-[32px] border border-white/20 shadow-2xl">
            <Image
              src="/img/visa-assistance-travel.png"
              alt="Passport and travel documents in an airport lounge"
              fill
              priority
              sizes="(min-width: 1536px) 590px, 42vw"
              className={cn("object-cover", styles.photograph)}
            />
            <div className="absolute inset-0 bg-linear-to-t from-brand-navy/65 via-transparent to-transparent" />
          </div>
          <div className="absolute right-5 bottom-0 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/95 px-5 py-4 text-brand-navy shadow-xl backdrop-blur-md">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileCheck2 className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium">
              Your next journey starts here
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
