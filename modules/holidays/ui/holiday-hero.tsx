import Image from "next/image"
import { cn } from "@/lib/utils"

type HolidayHeroProps = {
  title: string
  description: string
  image: string
  alt: string
  category?: string
}

export function HolidayHero(props: HolidayHeroProps) {
  return (
    <section
      className={cn(
        "relative -mt-[90px] flex items-end overflow-hidden bg-brand-navy text-primary-foreground",
        props.category ? "min-h-[520px]" : "min-h-[560px] md:min-h-[650px]"
      )}
    >
      <Image
        src={props.image}
        alt={props.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-brand-navy/25 via-brand-navy/10 to-brand-navy/90" />
      <div className="relative mx-auto grid w-full max-w-screen-2xl gap-6 px-5 pt-36 pb-10 sm:px-8 md:grid-cols-[1fr_340px] md:items-end md:gap-16 md:pb-20">
        <div className="flex flex-col gap-3">
          {props.category && <p className="text-sm">{props.category}</p>}
          <h1 className="max-w-[780px] font-heading text-4xl leading-[1.05] font-normal tracking-tight sm:text-5xl md:text-[88px]">
            {props.title}
          </h1>
        </div>
        <p className="max-w-lg text-sm leading-relaxed md:text-base">
          {props.description}
        </p>
      </div>
    </section>
  )
}
