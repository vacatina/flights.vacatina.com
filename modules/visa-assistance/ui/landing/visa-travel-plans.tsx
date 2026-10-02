import { ArrowUpRight, BriefcaseBusiness, Palmtree, Users } from "lucide-react"

const plans = [
  {
    title: "A well-earned holiday",
    description:
      "Beach days, city breaks, and a change of scenery. Start by checking services for your destination.",
    icon: Palmtree,
  },
  {
    title: "Your next business trip",
    description:
      "Meetings, conferences, or a visit to your host organization. Choose the service that fits your visit.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Time with your people",
    description:
      "Travelling together? Add each traveler to your request and prepare the documents for everyone.",
    icon: Users,
  },
]

export function VisaTravelPlans() {
  return (
    <section
      className="bg-brand-navy py-14 text-white md:py-16"
      aria-labelledby="visa-plans-title"
    >
      <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs tracking-[0.15em] text-white/60 uppercase">
              Different trips. One place to start.
            </p>
            <h2
              id="visa-plans-title"
              className="font-heading text-3xl tracking-tight md:text-4xl"
            >
              Big plans deserve a smooth start.
            </h2>
          </div>
          <a
            href="#visa-search"
            className="flex w-fit items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm transition-colors hover:bg-white hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Find your visa service <ArrowUpRight className="size-4" />
          </a>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[24px] border border-white/15 bg-white/5 p-6 md:p-8"
            >
              <Icon
                className="mb-6 size-8 text-white/85"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h3 className="mb-3 font-heading text-xl">{title}</h3>
              <p className="max-w-sm text-sm leading-relaxed text-white/65">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
