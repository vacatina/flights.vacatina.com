import { redirect } from "next/navigation"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"

export default async function RetiredVisaPricingPage() {
  await requireActiveAdmin()
  redirect("/admin/visa-listings")
}
