import { HolidayActionLink } from "@/modules/holidays/ui/holiday-action-link"

export default function HolidayNotFound() {
  return (
    <main className="w-full mx-auto flex min-h-[50vh] max-w-screen-2xl flex-col items-center justify-center gap-5 px-5 py-16 text-center">
      <h1 className="font-heading text-4xl">This holiday could not be found</h1>
      <p className="text-muted-foreground">
        Explore our collection to find your next Sri Lanka journey.
      </p>
      <HolidayActionLink href="/holiday-packages">
        Explore holiday packages
      </HolidayActionLink>
    </main>
  )
}
