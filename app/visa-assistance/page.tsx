import type { Metadata } from "next"

import { VisaAssistanceLanding } from "@/modules/visa-assistance/ui/visa-assistance-landing"

export const metadata: Metadata = {
  title: "Visa Assistance | Vacatina",
  description:
    "Explore Vacatina visa assistance services, document checklists, and estimated fees for your passport and destination.",
}

export default function VisaAssistancePage() {
  return <VisaAssistanceLanding />
}
