import {
  FileCheck2Icon,
  NotebookTabsIcon,
  PlaneTakeoffIcon,
} from "lucide-react"

const nextSteps = [
  {
    icon: NotebookTabsIcon,
    title: "Check your passport",
    description: "Make sure it meets the validity rule shown for your visa.",
  },
  {
    icon: FileCheck2Icon,
    title: "Confirm official rules",
    description: "Verify the latest entry requirements before booking.",
  },
  {
    icon: PlaneTakeoffIcon,
    title: "Allow enough time",
    description: "Apply early enough for processing before departure.",
  },
] as const

export function VisaNextStepsSection() {
  return (
    <section aria-labelledby="next-steps-heading">
      <h2
        id="next-steps-heading"
        className="font-heading text-2xl font-semibold tracking-[-0.025em] md:text-3xl"
      >
        Before you travel
      </h2>
      <div className="mt-6 border-t">
        {nextSteps.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="grid gap-3 border-b py-6 sm:grid-cols-[3rem_1fr] sm:items-start"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#13357b]/8 text-[#13357b] dark:bg-blue-300/10 dark:text-blue-300">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
