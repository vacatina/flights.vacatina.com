import { Skeleton } from "@/components/ui/skeleton"

export default function VisaDetailsLoading() {
  return (
    <main className="bg-muted/40">
      <section className="bg-primary px-5 py-16 md:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <Skeleton className="h-5 w-64 bg-primary-foreground/20" />
          <Skeleton className="mt-8 h-12 w-full max-w-3xl bg-primary-foreground/20" />
          <Skeleton className="mt-4 h-6 w-full max-w-2xl bg-primary-foreground/20" />
        </div>
      </section>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-10 md:grid-cols-2 md:px-8 lg:grid-cols-4 lg:px-12">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
    </main>
  )
}
