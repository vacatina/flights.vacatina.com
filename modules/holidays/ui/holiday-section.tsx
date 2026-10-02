import type { ReactNode } from "react"

export function HolidaySection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-3 font-heading text-2xl font-normal tracking-tight before:h-6 before:w-1 before:rounded-full before:bg-primary">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function HolidayBulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
