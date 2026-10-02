"use client"

import Image from "next/image"
import { ArrowUpRight, Globe2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CountryFlag } from "../country-flag"
import { VisaSearchForm } from "../visa-search-form"

const destinations = [
  {
    code: "SG",
    name: "Singapore",
    city: "City lights & new discoveries",
    image: "singapore",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    city: "A little Dubai daydream",
    image: "dubai",
  },
  {
    code: "TH",
    name: "Thailand",
    city: "Your next Bangkok escape",
    image: "bangkok",
  },
  {
    code: "GB",
    name: "United Kingdom",
    city: "Make a date with London",
    image: "london",
  },
]

export function VisaDestinations() {
  return (
    <section
      className="mx-auto w-full max-w-screen-2xl px-5 py-16 sm:px-8 md:py-20"
      aria-labelledby="visa-destinations-title"
    >
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.15em] text-primary uppercase">
            <Globe2 className="size-4" /> A world of possibilities
          </p>
          <h2
            id="visa-destinations-title"
            className="font-heading text-3xl tracking-tight md:text-4xl"
          >
            Where will you go <span className="text-primary italic">next?</span>
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Find visa services for your next destination. Availability depends on
          your passport country.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {destinations.map((destination) => (
          <Dialog key={destination.code}>
            <DialogTrigger className="group relative isolate flex min-h-[360px] flex-col justify-end overflow-hidden rounded-[28px] bg-brand-navy p-6 text-left text-white shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-primary/40 sm:min-h-[400px]">
              <Image
                src={`/img/destinations/${destination.image}.webp`}
                alt={`${destination.name} cityscape`}
                fill
                sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw"
                className="-z-20 object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-linear-to-t from-brand-navy/95 via-brand-navy/10 to-transparent"
              />
              <span className="mb-4 w-fit rounded-xl bg-white p-2.5">
                <CountryFlag
                  src={`/flags/${destination.code.toLowerCase()}.svg`}
                  className="h-6 w-9"
                />
              </span>
              <span className="font-heading text-2xl tracking-tight">
                {destination.name}
              </span>
              <span className="mt-2 text-sm text-white/75">
                {destination.city}
              </span>
              <span className="mt-6 flex items-center justify-between border-t border-white/25 pt-4 text-sm">
                Check visa services{" "}
                <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 motion-reduce:transition-none" />
              </span>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[26px] bg-white sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="pr-8 text-2xl">
                  Your trip to {destination.name}
                </DialogTitle>
                <DialogDescription>
                  Select your passport country to check available services.
                  Requirements vary by citizenship.
                </DialogDescription>
              </DialogHeader>
              <VisaSearchForm
                compact
                initialValues={{ destination: destination.code }}
              />
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </section>
  )
}
