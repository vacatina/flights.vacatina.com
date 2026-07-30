import Link from "next/link"

import {
  getCurrentBusinessSettings,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { BusinessSettingsForm } from "@/modules/flights/cancellations/ui"
import { Button } from "@/components/ui/button"

export default async function AdminSettingsPage() {
  await requireActiveAdmin()
  const settings = await getCurrentBusinessSettings()

  return (
    <main className="min-h-svh bg-background py-6 md:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 md:px-6 xl:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Admin settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Business and support details used by cancellation support screens.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/admin/cancellations" />}>
            Cancellations
          </Button>
        </header>
        <BusinessSettingsForm settings={settings} />
      </div>
    </main>
  )
}
