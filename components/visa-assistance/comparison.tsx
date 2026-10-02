import { Check, X } from "lucide-react"
import Image from "next/image"

const cons = [
  {
    title: "Confusing embassy instructions",
    description:
      "Government sites often have outdated links, unclear wording, and multiple versions of the same requirement.",
  },
  {
    title: "Risk of errors or rejection",
    description:
      "A small mistake on a form or missing document can result in delays or straight-up refusal.",
  },
  {
    title: "Limited submission times",
    description:
      "You need to match embassy schedules, appointment availability, and cut-off windows.",
  },
  {
    title: "No dedicated support",
    description:
      "If you get stuck, there's usually no one to call, message, or ask.",
  },
  {
    title: "No save-progress system",
    description:
      "If you lose a browser tab or connection, you often have to start the process again.",
  },
  {
    title: "Restricted payment methods",
    description: "Some portals accept only one or two types of payments.",
  },
]

const pros = [
  {
    title: "Simple, step-by-step application",
    description:
      "Crystal-clear forms built to remove confusion so you finish in minutes.",
  },
  {
    title: "Document check by visa specialists",
    description:
      "Your application is reviewed to reduce errors and avoid unnecessary delays.",
  },
  {
    title: "Apply whenever you want",
    description:
      "No embassy timings. No appointment headaches. Vacatina is open 24/7.",
  },
  {
    title: "Real human support",
    description:
      "Chat, phone, and email support whenever you need help — no more guessing.",
  },
  {
    title: "Save your progress",
    description:
      "Complete your application at your own pace without losing anything.",
  },
  {
    title: "Multiple payment options",
    description: "Pay the way you prefer — fast and secure every time.",
  },
]

export default function Comparison() {
  return (
    <div className="mt-8 grid w-full gap-6 lg:grid-cols-2">
      <div className="rounded-[26px] border border-primary/10 bg-background/50 p-6 sm:p-8">
        <h3 className="mb-6 border-b border-primary/10 pb-5 font-heading text-2xl tracking-tight">
          Do it yourself
        </h3>
        <ul className="flex flex-col gap-6">
          {cons.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <X className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h4 className="mb-1 text-sm font-medium">{item.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative overflow-hidden rounded-[26px] border border-primary/20 bg-card p-6 shadow-[0_16px_40px_-24px_rgba(10,19,69,0.3)] sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-primary"
        />
        <h3 className="mb-6 flex items-center gap-3 border-b border-primary/10 pb-5 font-heading text-2xl tracking-tight">
          <span>With</span>
          <Image
            src="/img/general/logo-dark.svg"
            alt="Vacatina"
            width={145}
            height={38}
          />
        </h3>
        <ul className="flex flex-col gap-6">
          {pros.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h4 className="mb-1 text-sm font-medium">{item.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
