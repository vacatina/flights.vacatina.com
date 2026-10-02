import Image from "next/image"
import { CalendarDays, Check, FileText, IdCard, Users } from "lucide-react"

const checklist = [
  {
    title: "Your passport",
    text: "Have a clear copy of the passport details page ready.",
    icon: IdCard,
  },
  {
    title: "Your travel dates",
    text: "Plan your intended departure and return dates.",
    icon: CalendarDays,
  },
  {
    title: "Your travel party",
    text: "Gather the details for each person joining your trip.",
    icon: Users,
  },
  {
    title: "Your document checklist",
    text: "Review the specific documents listed for your chosen service.",
    icon: FileText,
  },
]

export function VisaPreparation() {
  return (
    <section
      className="mx-auto grid w-full max-w-screen-2xl gap-10 px-5 py-16 sm:px-8 md:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"
      aria-labelledby="visa-preparation-title"
    >
      <div className="relative min-h-[380px] overflow-hidden rounded-[30px] bg-brand-navy lg:min-h-[480px]">
        <Image
          src="/img/visa-assistance-travel.png"
          alt="Passport and travel documents ready for a journey"
          fill
          sizes="(min-width:1024px) 45vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg sm:inset-x-7 sm:bottom-7">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-5" />
          </span>
          <div>
            <p className="font-medium">A little preparation goes a long way.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start with the essentials. We’ll help with the next steps.
            </p>
          </div>
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium tracking-[0.15em] text-primary uppercase">
          Before you begin
        </p>
        <h2
          id="visa-preparation-title"
          className="max-w-lg font-heading text-3xl tracking-tight md:text-4xl"
        >
          Less last-minute searching.
          <br />
          <span className="text-primary italic">More ready-to-go.</span>
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Keep these essentials handy when you start your request. The exact
          checklist depends on your destination and visa type.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {checklist.map(({ title, text, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[22px] border border-primary/10 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(10,19,69,0.25)]"
            >
              <Icon
                aria-hidden="true"
                className="mb-4 size-6 text-primary"
                strokeWidth={1.5}
              />
              <h3 className="font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
