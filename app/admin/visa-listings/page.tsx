import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import { listAdminVisaListings } from "@/modules/visa-assistance/catalog/server/admin-queries"
import { VisaListingDirectory } from "@/modules/visa-assistance/catalog/ui/listing-directory"

export default async function VisaListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const admin = await requireActiveAdmin()
  const query = await searchParams
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 120) : ""
  const status =
    query.status === "draft" || query.status === "published"
      ? query.status
      : undefined
  const result = await listAdminVisaListings({
    search,
    status,
    page: Number(query.page) || 1,
  })

  return (
    <AdminPanelShell
      active="visa-listings"
      title="Visa Listings"
      description="Manage visa descriptions, final customer fees, and document requirements."
      adminEmail={admin.email}
    >
      <VisaListingDirectory result={result} search={search} status={status} />
    </AdminPanelShell>
  )
}
