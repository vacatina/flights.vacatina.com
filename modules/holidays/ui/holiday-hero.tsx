import Link from "next/link"
import { ArrowDownRight, MapPin } from "lucide-react"
import styles from "./holiday-motion.module.css"
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
        className={cn("object-cover", styles.heroImage)}
      />
      <div className="absolute inset-0 bg-linear-to-b from-brand-navy/85 via-brand-navy/30 to-brand-navy/95" />
      <div className="relative mx-auto grid w-full max-w-screen-2xl gap-6 px-5 pt-36 pb-10 sm:px-8 md:grid-cols-[1fr_340px] md:items-end md:gap-16 md:pb-20">
        <div className="flex flex-col gap-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase">
            <MapPin className="size-4" aria-hidden="true" />
            {props.category ?? "Sri Lanka"}
          </p>
          <h1 className="max-w-[780px] font-heading text-4xl leading-[1.05] font-normal tracking-tight sm:text-5xl md:text-[100px]">
            {props.category ? (
              props.title
            ) : (
              <>
                <span className="block">Holiday</span>
                <span className="block text-white/80 italic">packages</span>
              </>
            )}
          </h1>
        </div>
        <div className="max-w-lg rounded-[24px] border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
          <p className="text-sm leading-relaxed md:text-base">
            {props.description}
          </p>
          <Link
            href={props.category ? "#holiday-enquiry" : "#holiday-experiences"}
            className="mt-5 flex items-center justify-between gap-4 border-t border-white/20 pt-4 text-sm font-medium hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            {props.category ? "Plan this holiday" : "Explore the island"}
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-brand-navy">
              <ArrowDownRight className="size-5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
