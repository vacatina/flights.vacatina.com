import {
  CalendarDays,
  ClipboardCheck,
  FileUp,
  Mail,
  Users,
  type LucideIcon,
} from "lucide-react"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { VISA_APPLICATION_STEPS } from "../domain"
type VisaApplicationStep = (typeof VISA_APPLICATION_STEPS)[number]

export const visaFormCard =
  "overflow-hidden rounded-[26px] border border-primary/10 bg-white shadow-[0_16px_45px_-30px_rgba(10,19,69,0.35)] ring-0 [&_input:not([type=hidden]):not([type=file]):not([type=checkbox])]:h-12 [&_input:not([type=hidden]):not([type=file]):not([type=checkbox])]:rounded-xl [&_input:not([type=hidden]):not([type=file]):not([type=checkbox])]:border-primary/10 [&_input:not([type=hidden]):not([type=file]):not([type=checkbox])]:bg-primary/[0.035] [&_select]:h-12 [&_select]:rounded-xl [&_select]:border-primary/10 [&_select]:bg-primary/[0.035]"
export const visaFormFooter =
  "border-t border-primary/10 bg-primary/[0.035] py-5"

const stepIcons: Record<VisaApplicationStep, LucideIcon> = {
  trip: CalendarDays,
  travelers: Users,
  contact: Mail,
  documents: FileUp,
  review: ClipboardCheck,
}

export function VisaStepHeader({
  step,
  title,
  description,
}: {
  step: VisaApplicationStep
  title: string
  description: string
}) {
  const Icon = stepIcons[step]
  return (
    <CardHeader className="flex items-start gap-4 border-b border-primary/10 pb-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <CardTitle className="font-heading text-2xl font-normal tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="leading-relaxed">
          {description}
        </CardDescription>
      </div>
    </CardHeader>
  )
}
