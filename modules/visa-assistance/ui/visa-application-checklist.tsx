import Image from "next/image"
import {
  CalendarDaysIcon,
  ContactIcon,
  HouseIcon,
  NotebookTabsIcon,
} from "lucide-react"

const checklist = [
  {
    icon: NotebookTabsIcon,
    title: "Passport information",
    description: "Your current passport and its expiry details.",
  },
  {
    icon: CalendarDaysIcon,
    title: "Travel dates",
    description: "Your expected arrival and departure dates.",
  },
  {
    icon: HouseIcon,
    title: "Accommodation details",
    description: "The address where you plan to stay.",
  },
  {
    icon: ContactIcon,
    title: "Contact information",
    description: "An email address and phone number you can access.",
  },
] as const

export function VisaApplicationChecklist() {
  return (
    <section
      aria-labelledby="application-checklist-heading"
      className="grid overflow-hidden rounded-2xl bg-[#eef3f8] lg:grid-cols-[0.9fr_1.1fr] dark:bg-card"
    >
      <div className="relative min-h-72 lg:min-h-full">
        <Image
          src="/img/visa-assistance-travel.png"
          alt="Passport and travel document prepared for an application"
          fill
          sizes="(max-width: 1023px) 100vw, 42vw"
          className="object-cover"
        />
      </div>

      <div className="p-6 md:p-9 lg:p-12">
        <h2
          id="application-checklist-heading"
          className="font-heading text-2xl font-semibold tracking-[-0.025em] md:text-3xl"
        >
          Prepare before you apply
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Most online applications ask for these basics. Additional documents
          may be requested for your specific visa.
        </p>

        <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {checklist.map(({ icon: Icon, title, description }) => (
            <div key={title} className="grid grid-cols-[2.5rem_1fr] gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-background text-[#13357b] dark:bg-muted dark:text-blue-300">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
