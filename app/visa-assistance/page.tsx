import type { Metadata } from "next"

import { VisaAssistanceLanding } from "@/modules/visa-assistance/ui"

export const metadata: Metadata = {
  title: "Visa Assistance | Vacatina",
  description:
    "Check visa and travel-document requirements for your passport and destination.",
}

export default function VisaAssistancePage() {
  return <VisaAssistanceLanding />
}
