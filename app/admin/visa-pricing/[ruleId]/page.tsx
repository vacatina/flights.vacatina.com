import { redirect } from "next/navigation"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"

export default async function RetiredEditVisaPricingPage() {
  await requireActiveAdmin()
  redirect("/admin/visa-listings")
}
