import { redirect } from "next/navigation"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"

export default async function RetiredNewVisaPricingPage() {
  await requireActiveAdmin()
  redirect("/admin/visa-listings/new")
}
