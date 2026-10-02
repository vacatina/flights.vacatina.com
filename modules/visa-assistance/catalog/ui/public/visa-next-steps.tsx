import Image from "next/image"
import { FileSearch, Send, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { visaPanel } from "./visa-surfaces"

const steps = [
  {
    icon: FileSearch,
    title: "Explore your service",
    description: "Review the visa details, documents and estimated price.",
  },
  {
    icon: Send,
    title: "Start your request",
    description: "Share your trip details through the application form.",
  },
  {
    icon: MessageCircle,
    title: "Our team takes a look",
    description: "We confirm eligibility and your final quote before payment.",
  },
]

export function VisaNextSteps() {
  return (
    <aside
      className={cn(
        visaPanel,
        "overflow-hidden lg:sticky lg:top-28 lg:self-start"
      )}
      aria-labelledby="visa-next-steps-heading"
    >
      <div className="relative aspect-[1.9] overflow-hidden">
        <Image
          src="/img/visa-img/3visa.png"
          alt="Travel consultant reviewing documents"
          fill
          sizes="(min-width: 1024px) 340px, 90vw"
          className="object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-brand-navy/65 to-transparent" />
        <h2
          id="visa-next-steps-heading"
          className="absolute bottom-5 left-6 font-heading text-2xl text-white"
        >
          Your next steps
        </h2>
      </div>
      <ol className="flex flex-col gap-6 p-6">
        {steps.map(({ icon: Icon, title, description }, index) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="mb-1 text-[10px] font-medium tracking-widest text-primary uppercase">
                Step {index + 1}
              </p>
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  )
}
