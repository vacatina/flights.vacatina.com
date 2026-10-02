import Image from "next/image"
import { Compass } from "lucide-react"
import type { ReactNode } from "react"

export function VisaPhotoHero({
  title,
  description,
  image,
  alt,
  imagePosition = "center 60%",
}: {
  title: ReactNode
  description: string
  image: string
  alt: string
  imagePosition?: string
}) {
  return (
    <section className="relative -mt-[90px] flex min-h-[510px] items-end overflow-hidden bg-brand-navy text-white md:min-h-[570px]">
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
      <div className="relative mx-auto grid w-full max-w-screen-2xl gap-7 px-5 pt-40 pb-20 sm:px-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-end md:gap-16">
        <div className="flex min-w-0 flex-col gap-5">
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-white/80 uppercase">
            <Compass className="size-4" aria-hidden="true" />
            Vacatina visa assistance
          </p>
          <h1 className="max-w-[850px] font-heading text-4xl leading-[1.06] font-normal tracking-tight text-balance [overflow-wrap:anywhere] sm:text-5xl xl:text-[72px]">
            {title}
          </h1>
        </div>
        <div className="rounded-[24px] border border-white/25 bg-white/10 p-6 backdrop-blur-md">
          <p className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line text-white/90 md:text-base">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
