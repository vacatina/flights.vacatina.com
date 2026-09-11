import { TravelProgressLoader } from "@/components/ui/travel-progress-loader"

export default function VisaApplicationLoading() {
  return (
    <main className="flex min-h-[calc(100svh-5rem)] items-center justify-center bg-muted/30 px-6">
      <TravelProgressLoader
        message="Preparing your visa application..."
        description="Loading your saved details and latest estimate."
      />
    </main>
  )
}
