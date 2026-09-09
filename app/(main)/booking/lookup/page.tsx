import Link from "next/link"

import { GuestBookingLookupForm } from "@/modules/flights/orders/ui"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default async function BookingLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>
}) {
  const { reference } = await searchParams

  return (
    <main className="min-h-svh bg-muted/40 py-8 md:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 md:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Booking lookup</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Booking lookup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your booking reference and email to access your booking details.
          </p>
        </div>

        <GuestBookingLookupForm initialReference={reference} />
      </div>
    </main>
  )
}
