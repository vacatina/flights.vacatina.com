import { notFound } from "next/navigation"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import { toListingFormValues } from "@/modules/visa-assistance/catalog/domain/form-values"
import {
  getVisaListing,
  listVisaListingEvents,
} from "@/modules/visa-assistance/catalog/server/repository"
import { VisaListingAuditTimeline } from "@/modules/visa-assistance/catalog/ui/audit-timeline"
import { VisaListingEditor } from "@/modules/visa-assistance/catalog/ui/listing-editor"

export default async function EditVisaListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const admin = await requireActiveAdmin()
  const { listingId } = await params
  const [listing, events, query] = await Promise.all([
    getVisaListing(listingId),
    listVisaListingEvents(listingId),
    searchParams,
  ])
  if (!listing) notFound()

  return (
    <AdminPanelShell
      active="visa-listings"
      title={listing.title || "Edit visa listing"}
      description="Update this visa’s details, estimates, and upload checklist."
      adminEmail={admin.email}
    >
      <div className="flex flex-col gap-6">
        <VisaListingEditor
          key={listing.id}
          id={listing.id}
          initialStatus={listing.status}
          initialValues={toListingFormValues(listing)}
          justSaved={query.saved === "1"}
        />
        <VisaListingAuditTimeline events={events} />
      </div>
    </AdminPanelShell>
  )
}
