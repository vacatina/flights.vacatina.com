import Image from "next/image"
import { Compass } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function VisaPhotoHero({
  title,
  description,
  image,
  alt,
  imagePosition = "center 60%",
  compact = false,
}: {
  title: ReactNode
  description: string
  image: string
  alt: string
  imagePosition?: string
  compact?: boolean
}) {
  return (
    <section
      className={cn(
        "relative -mt-[90px] flex items-end overflow-hidden bg-brand-navy text-white",
        compact
          ? "min-h-[320px] md:min-h-[350px]"
          : "min-h-[510px] md:min-h-[570px]"
      )}
    >
      <Image
        src={image}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: imagePosition }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-brand-navy/65" />
      <div
        className={cn(
          "relative mx-auto grid w-full max-w-screen-2xl px-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-end",
          compact
            ? "gap-4 pt-32 pb-14 md:gap-10"
            : "gap-7 pt-40 pb-20 md:gap-16"
        )}
      >
        <div
          className={cn("flex min-w-0 flex-col", compact ? "gap-3" : "gap-5")}
        >
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-white/80 uppercase">
            <Compass className="size-4" aria-hidden="true" />
            Vacatina visa assistance
          </p>
          <h1
            className={cn(
              "max-w-[850px] font-heading leading-[1.06] font-normal tracking-tight text-balance [overflow-wrap:anywhere]",
              compact
                ? "text-3xl sm:text-4xl xl:text-5xl"
                : "text-4xl sm:text-5xl xl:text-[72px]"
            )}
          >
            {title}
          </h1>
        </div>
        <div
          className={cn(
            "rounded-[24px] border border-white/25 bg-white/10 backdrop-blur-md",
            compact ? "p-4" : "p-6"
          )}
        >
          <p className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line text-white/90 md:text-base">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
