import Image from "next/image"

import { HeroVideoBackground } from "@/modules/home/ui/hero-video-background"
import { FlightSearchForm } from "@/modules/flights/search/ui"
import type { FlightSearchFormValues } from "@/modules/flights/search/domain"

export function HeroSection({
  initialValues,
}: {
  initialValues?: FlightSearchFormValues
}) {
  return (
    <section
      id="flight-search"
      aria-labelledby="home-title"
      className="relative isolate -mt-[90px] flex min-h-[700px] scroll-mt-0 flex-col overflow-hidden bg-[#1a2a3d] pt-[90px] pb-12 md:min-h-[min(820px,100dvh)]"
    >
      <Image
        src="/img/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <HeroVideoBackground />
      <div className="absolute inset-0 bg-[#05103680]" />
      <div className="relative mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-4 pt-10 md:px-8 md:pt-16 lg:px-12">
        <div className="mx-auto max-w-4xl text-center text-white">
          <h1
            id="home-title"
            className="text-[38px] leading-[1.12] font-semibold tracking-[-0.035em] text-balance sm:text-5xl md:text-[56px]"
          >
            Your next journey starts here.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-balance text-white/90 md:text-lg">
            Find your flight, compare your options, and make room for something
            new.
          </p>
        </div>
        <div className="mx-auto mt-9 mb-8 w-full md:mt-11">
          <FlightSearchForm initialValues={initialValues} />
        </div>
      </div>
    </section>
  )
}
