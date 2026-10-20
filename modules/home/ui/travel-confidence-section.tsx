import {
  BadgeCheckIcon,
  HeartIcon,
  Layers3Icon,
  MessagesSquareIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

const benefits = [
  {
    icon: Layers3Icon,
    title: "Everything in one place",
    description: "Plan across flights, stays, visa assistance and curated holiday journeys.",
  },
  {
    icon: SlidersHorizontalIcon,
    title: "Transparent trip planning",
    description: "Configure the travel details that affect price before you commit.",
  },
  {
    icon: HeartIcon,
    title: "Save ideas before committing",
    description: "Keep inspiration separate from configured, booking-ready trip items.",
  },
  {
    icon: BadgeCheckIcon,
    title: "Provider-backed results",
    description: "Live inventory comes from connected suppliers and is revalidated before booking.",
  },
  {
    icon: MessagesSquareIcon,
    title: "Human support when needed",
    description: "Use Vacatina support for assisted services and journeys that need more guidance.",
  },
]

export function TravelConfidenceSection() {
  return (
    <section
      id="travel-confidence"
      aria-labelledby="travel-confidence-title"
      className="bg-[#FAFAFA] py-16 md:py-20"
    >
      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
          Travel With Confidence
        </p>
        <h2
          id="travel-confidence-title"
          className="mt-3 max-w-3xl font-heading text-3xl font-bold tracking-[-0.03em] text-[#111] md:text-[40px]"
        >
          Plan with clarity from inspiration to departure
        </h2>
        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-[#E5E5E5] bg-white p-6"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#1B1464]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-heading text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#525252]">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#E5E5E5] bg-white p-5">
          <p className="text-sm font-semibold text-[#1B1464]">Secure payment options</p>
          <p className="mt-1 text-sm leading-6 text-[#525252]">
            Available payment methods are shown during checkout. Provider availability
            is verified in the active checkout flow rather than promised on the homepage.
          </p>
        </div>
      </div>
    </section>
  )
}
