import { MapPin } from "lucide-react"

export function HolidayRoute({ stops }: { stops: string[] }) {
  return (
    <ol className="grid gap-x-5 gap-y-4 rounded-2xl bg-primary/5 p-5 sm:grid-cols-2">
      {stops.map((stop, index) => (
        <li key={`${stop}-${index}`} className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-sm font-medium text-primary">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 text-sm font-medium">{stop}</span>
          <MapPin className="size-4 text-primary/50" aria-hidden="true" />
        </li>
      ))}
    </ol>
  )
}
