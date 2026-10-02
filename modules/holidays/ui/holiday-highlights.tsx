import { MapPin } from "lucide-react"
import { holidayPanel } from "./holiday-surfaces"
import { cn } from "@/lib/utils"

export function HolidayHighlights({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className={cn(holidayPanel, "flex items-center gap-3 p-4")}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm leading-relaxed font-medium">{item}</span>
        </li>
      ))}
    </ul>
  )
}
