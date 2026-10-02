import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import {
  listAdminCancellationRequests,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { getVisaAssistanceResult } from "@/modules/visa-assistance/server"
import { defaultVisaPricingRuleRepository } from "@/modules/visa-assistance/pricing/server"
import { AdminVisaPricingDashboard } from "@/modules/visa-assistance/pricing/ui"

interface PageProps {
  searchParams: Promise<{ nationality?: string; destination?: string }>
}

export default async function LegacyAdminVisaPricingPage({
  searchParams,
}: PageProps) {
  const admin = await requireActiveAdmin()
  const query = await searchParams
  const nationality = query.nationality?.trim().toUpperCase()
  const destination = query.destination?.trim().toUpperCase()
  const [rules, events, queueItems] = await Promise.all([
    defaultVisaPricingRuleRepository.listAll(),
    defaultVisaPricingRuleRepository.listRecentEvents(),
    listAdminCancellationRequests(),
  ])
  let preview = null
  let previewError: string | null = null

  if (nationality && destination && nationality !== destination) {
    try {
      preview = await getVisaAssistanceResult(nationality, destination)
    } catch (error) {
      previewError =
        error instanceof Error
          ? error.message
          : "Live visa pricing could not be loaded."
    }
  }

  return (
    <AdminPanelShell
      active="visa-pricing"
      title="Visa Pricing"
      description="Control Vacatina markups, preview current supplier costs, and audit every pricing change."
      adminEmail={admin.email}
      queueItems={queueItems}
    >
      <AdminVisaPricingDashboard
        rules={rules}
        events={events}
        preview={preview}
        previewError={previewError}
        initialNationality={nationality}
        initialDestination={destination}
      />
    </AdminPanelShell>
  )
}
