import {
  BadgeCheckIcon,
  Clock3Icon,
  FileSearchIcon,
  Globe2Icon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

const steps = [
  {
    icon: FileSearchIcon,
    title: "Tell us your route",
    description: "Choose the country on your passport and your destination.",
  },
  {
    icon: SparklesIcon,
    title: "Get a clear decision",
    description: "See whether a visa or another travel document is required.",
  },
  {
    icon: BadgeCheckIcon,
    title: "Review every detail",
    description:
      "Compare eligibility, validity, stay, entries, and captured fees.",
  },
] as const

export function VisaAssistanceLanding() {
  return (
    <main className="overflow-hidden bg-background">
      <section className="relative isolate bg-primary text-primary-foreground">
        <div
          className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:28px_28px] opacity-15"
          aria-hidden="true"
        />
        <div
          className="absolute -top-40 right-[-12rem] size-[34rem] rounded-full border border-primary-foreground/15"
          aria-hidden="true"
        />
        <div
          className="absolute top-6 right-[-5rem] size-[22rem] rounded-full border border-primary-foreground/10"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-5 py-18 md:px-8 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-12 lg:py-28">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-6">
              <Globe2Icon data-icon="inline-start" />
              Visa assistance
            </Badge>
            <h1 className="font-heading text-5xl leading-[0.98] font-semibold tracking-[-0.04em] text-balance md:text-7xl">
              Know before you go.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-primary-foreground/80 md:text-xl">
              Check the travel-document rules for your passport and destination,
              with live visa details presented in one clear place.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-primary-foreground/75">
              <span className="inline-flex items-center gap-2">
                <Clock3Icon className="size-4" /> Fast country search
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="size-4" /> Server-side API access
              </span>
            </div>
          </div>

          <Card className="relative border-0 py-0 shadow-2xl ring-0">
            <CardHeader className="border-b px-6 py-6 md:px-8">
              <CardTitle className="text-xl">Check your visa</CardTitle>
              <CardDescription>
                Search using ISO-compliant country data.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-7 md:px-8 md:py-8">
              <VisaSearchForm />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 md:px-8 md:py-22 lg:px-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
            A simpler visa check
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.025em] text-balance md:text-4xl">
            From two countries to a complete answer
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <Card key={step.title} className="relative shadow-none">
                <CardHeader>
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>
    </main>
  )
}
