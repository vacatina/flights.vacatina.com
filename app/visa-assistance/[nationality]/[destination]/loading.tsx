import { Skeleton } from "@/components/ui/skeleton"

export default function VisaDetailsLoading() {
  return (
    <main className="bg-background">
      <section className="border-b bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8 md:py-16 lg:px-12 lg:py-20">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-8 h-16 w-full max-w-3xl" />
          <Skeleton className="mt-5 h-6 w-full max-w-xl" />
          <Skeleton className="mt-10 h-20 w-full" />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-12 md:px-8 md:py-16 lg:px-12">
        <Skeleton className="h-24 w-full max-w-3xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full" />
      </div>
    </main>
  )
}
