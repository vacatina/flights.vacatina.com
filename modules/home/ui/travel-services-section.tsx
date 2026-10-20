import Link from "next/link"
import {
  ArrowUpRightIcon,
  HeadphonesIcon,
  LuggageIcon,
  StampIcon,
} from "lucide-react"

const services = [
  {
    title: "Manage a booking",
    description: "Open an existing flight booking and review the self-service options available for that order.",
    action: "Manage booking",
    href: "/booking/lookup",
    icon: LuggageIcon,
  },
  {
    title: "Track a visa application",
    description: "Return to your Vacatina visa request and review its current application status.",
    action: "Visa applications",
    href: "/visa-requests",
    icon: StampIcon,
  },
  {
    title: "Contact support",
    description: "Need help planning or managing a journey? Contact the Vacatina team.",
    action: "Contact support",
    href: "mailto:info@vacatina.com",
    icon: HeadphonesIcon,
  },
] as const

export function TravelServicesSection() {
  return (
    <section
      aria-labelledby="journey-management-title"
      className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 md:py-20 lg:px-8"
    >
      <div className="rounded-[24px] border border-[#E5E5E5] bg-[#FAFAFA] p-6 md:p-10">
        <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
          Manage Your Journey
        </p>
        <h2
          id="journey-management-title"
          className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[#111]"
        >
          Your journey, in one place
        </h2>
        <div className="mt-8 grid divide-y divide-[#E5E5E5] md:grid-cols-3 md:divide-x md:divide-y-0">
          {services.map(({ title, description, action, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex min-h-52 flex-col py-6 first:pt-0 last:pb-0 focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B1464] md:px-7 md:py-0 md:first:pl-0 md:last:pr-0"
            >
              <Icon
                aria-hidden="true"
                strokeWidth={1.6}
                className="mb-5 size-7 text-[#1B1464]"
              />
              <h3 className="font-heading text-lg font-semibold">{title}</h3>
              <p className="mt-2 max-w-72 text-sm leading-6 text-[#525252]">
                {description}
              </p>
              <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-[#1B1464]">
                {action}
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
