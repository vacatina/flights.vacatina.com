import {
  HeadphonesIcon,
  SlidersHorizontalIcon,
  TicketsPlaneIcon,
} from "lucide-react"

const benefits = [
  {
    icon: SlidersHorizontalIcon,
    title: "More ways to get there",
    description: "Compare airlines, times, and connections.",
  },
  {
    icon: TicketsPlaneIcon,
    title: "A fare that fits",
    description: "Review baggage and fare conditions before booking.",
  },
  {
    icon: HeadphonesIcon,
    title: "Help when you need it",
    description: "Contact our team about your booking.",
  },
]

export function TravelConfidenceSection() {
  return (
    <section
      aria-labelledby="travel-confidence-title"
      className="mx-auto max-w-7xl px-4 pb-16 md:px-8 lg:px-12"
    >
      <div className="border-t border-border pt-10">
        <h2
          id="travel-confidence-title"
          className="mb-7 text-sm font-medium text-muted-foreground"
        >
          Travel with confidence
        </h2>
        <div className="grid gap-7 md:grid-cols-3 md:gap-8">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-4">
              <Icon
                aria-hidden="true"
                strokeWidth={1.5}
                className="mt-0.5 size-5 shrink-0 text-[#13357b] dark:text-blue-300"
              />
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1.5 max-w-64 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
