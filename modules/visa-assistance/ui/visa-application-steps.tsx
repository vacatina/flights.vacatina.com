import { FileSearchIcon, SendIcon, SquareCheckBigIcon } from "lucide-react"

const steps = [
  {
    icon: FileSearchIcon,
    title: "Review",
    description: "Confirm the visa rules and check your passport validity.",
  },
  {
    icon: SendIcon,
    title: "Apply",
    description:
      "Continue to the application provider and submit your details.",
  },
  {
    icon: SquareCheckBigIcon,
    title: "Confirm",
    description:
      "Follow the provider’s updates and verify approval before travel.",
  },
] as const

export function VisaApplicationSteps() {
  return (
    <section aria-labelledby="application-steps-heading">
      <h2
        id="application-steps-heading"
        className="font-heading text-2xl font-semibold tracking-[-0.025em] md:text-3xl"
      >
        From guidance to application
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        A simple path from checking the requirement to preparing for travel.
      </p>

      <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
        {steps.map(({ icon: Icon, title, description }, index) => (
          <li
            key={title}
            className="border-t border-[#13357b]/15 pt-5 dark:border-border"
          >
            <div className="flex items-center justify-between gap-4">
              <Icon
                className="size-5 text-[#13357b] dark:text-blue-300"
                aria-hidden="true"
              />
              <span className="text-xs text-muted-foreground">
                0{index + 1}
              </span>
            </div>
            <h3 className="mt-8 text-lg font-semibold tracking-tight">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
