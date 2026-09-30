import { notFound } from "next/navigation"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import {
  EMPTY_LISTING_VALUES,
  toListingFormValues,
} from "@/modules/visa-assistance/catalog/domain/form-values"
import { getVisaListing } from "@/modules/visa-assistance/catalog/server/repository"
import { VisaListingEditor } from "@/modules/visa-assistance/catalog/ui/listing-editor"

export default async function NewVisaListingPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>
}) {
  const admin = await requireActiveAdmin()
  const query = await searchParams
  const source =
    typeof query.duplicate === "string"
      ? await getVisaListing(query.duplicate)
      : null
  if (query.duplicate && !source) notFound()

  return (
    <AdminPanelShell
      active="visa-listings"
      title={source ? "Duplicate visa listing" : "New visa listing"}
      description="Add a route, describe the visa, enter estimated fees, and configure the uploads."
      adminEmail={admin.email}
    >
      <VisaListingEditor
        key={source?.id ?? "new"}
        duplicated={Boolean(source)}
        initialValues={
          source ? toListingFormValues(source, true) : EMPTY_LISTING_VALUES
        }
      />
    </AdminPanelShell>
  )
}
