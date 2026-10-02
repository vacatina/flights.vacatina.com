import Link from "next/link"
import {
  ArrowUpRightIcon,
  LuggageIcon,
  PlaneIcon,
  StampIcon,
} from "lucide-react"

import { contactData } from "@/lib/shared/contact-data"

const services = [
  {
    title: "Find your flight",
    description: "Your dates. Your destination. Your next adventure.",
    action: "Search flights",
    href: "#flight-search",
    icon: PlaneIcon,
  },
  {
    title: "Visa assistance",
    description: "A little guidance before you cross the border.",
    action: "Enquire about visas",
    href: `mailto:${contactData.email}?subject=Visa%20assistance%20enquiry`,
    icon: StampIcon,
  },
  {
    title: "Already booked?",
    description: "Your itinerary and booking details, all together.",
    action: "Manage booking",
    href: "/booking/lookup",
    icon: LuggageIcon,
  },
] as const

export function TravelServicesSection() {
  return (
    <section
      aria-labelledby="travel-services-title"
      className="w-full mx-auto max-w-screen-2xl px-4 pb-16 md:px-8 md:pb-20 lg:px-12"
    >
      <div className="rounded-2xl bg-[#f1f5fa] p-6 md:p-10 dark:bg-card">
        <h2
          id="travel-services-title"
          className="text-2xl font-semibold tracking-[-0.025em] md:text-[30px]"
        >
          A little help, wherever you are.
        </h2>
        <div className="mt-8 grid divide-y divide-[#13357b]/10 md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-border">
          {services.map(({ title, description, action, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex flex-col py-6 first:pt-0 last:pb-0 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#13357b] md:px-7 md:py-0 md:first:pl-0 md:last:pr-0"
            >
              <Icon
                aria-hidden="true"
                strokeWidth={1.5}
                className="mb-5 size-7 text-[#13357b] dark:text-blue-300"
              />
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 max-w-60 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
              <span className="mt-6 flex items-center gap-2 text-sm font-medium text-[#13357b] dark:text-blue-300">
                {action}
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
