import type {
  visaApplicationDocuments,
  visaApplications,
  visaApplicationTravelers,
} from "@/lib/db/schema"

export type VisaApplication = typeof visaApplications.$inferSelect
export type VisaApplicationTraveler =
  typeof visaApplicationTravelers.$inferSelect
export type VisaApplicationDocument =
  typeof visaApplicationDocuments.$inferSelect

export interface VisaApplicationDetail {
  application: VisaApplication
  travelers: VisaApplicationTraveler[]
  documents: VisaApplicationDocument[]
}

export type VisaApplicationActionFailure = {
  ok: false
  message: string
}

export type VisaApplicationActionResult =
  { ok: true } | VisaApplicationActionFailure
