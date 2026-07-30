import Link from "next/link"

import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminCancellationQueue } from "@/modules/flights/cancellations/ui"
import { Button } from "@/components/ui/button"

export default async function AdminCancellationsPage() {
  await requireActiveAdmin()
  const items = await listAdminCancellationRequests()

  return (
    <main className="min-h-svh bg-background py-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 md:px-6 xl:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Cancellation queue
            </h1>
            <p className="text-sm text-muted-foreground">
              Internal full-booking cancellation workflow.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/admin/settings" />}>
            Settings
          </Button>
        </header>
        <AdminCancellationQueue items={items} />
      </div>
    </main>
  )
}
