import { z } from "zod"

import {
  contactStepSchema,
  reviewConsentSchema,
  travelersStepSchema,
  tripStepSchema,
} from "@/modules/visa-assistance/applications/domain/application-schema"

export type TripStepValues = z.infer<typeof tripStepSchema>
export type TravelersStepValues = z.infer<typeof travelersStepSchema>
export type ContactStepValues = z.infer<typeof contactStepSchema>
export type ReviewStepValues = z.infer<typeof reviewConsentSchema>
