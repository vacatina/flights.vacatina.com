import { VisaApplicationError } from "@/modules/visa-assistance/applications/domain/application-error"
import "server-only"

import { and, eq, gte } from "drizzle-orm"
import { visaApplicationTravelers } from "@/lib/db/schema"
import {
  contactStepSchema,
  reviewConsentSchema,
  travelersStepSchema,
  tripStepSchema,
  createApplicationPricing,
  getVisaApplicationResumeStep,
  type VisaApplicationDetail,
} from "../domain"
import {
  addVisaApplicationEvent,
  getVisaApplicationDetail,
  listOwnedVisaApplications,
  saveVisaApplicationTravelers,
  submitVisaApplicationRecord,
  updateVisaApplication,
  withEditableVisaApplication,
} from "./application-repository"
import { enqueueVisaSubmissionNotification } from "./submission-notifications"

export { createVisaApplicationDraft } from "./create-draft"

export async function getOwnedVisaApplication(
  applicationId: string,
  actorUserId: string
): Promise<VisaApplicationDetail> {
  const detail = await getVisaApplicationDetail(applicationId)
  if (!detail || detail.application.ownerUserId !== actorUserId) {
    throw new VisaApplicationError("Visa request not found.")
  }
  return detail
}

export async function getOwnedVisaApplicationList(input: {
  actorUserId: string
  page: number
  pageSize: number
}) {
  return listOwnedVisaApplications({
    ownerUserId: input.actorUserId,
    limit: input.pageSize,
    offset: (input.page - 1) * input.pageSize,
  })
}

export async function saveVisaApplicationTrip(input: {
  actorUserId: string
  applicationId: string
  entryDate: string
  travelerCount: number
}) {
  const parsed = tripStepSchema.parse(input)
  await withEditableVisaApplication(
    parsed.applicationId,
    input.actorUserId,
    async (tx, detail) => {
      const changedCount =
        parsed.travelerCount !== detail.application.travelerCount
      const removedIds = new Set(
        detail.travelers
          .filter((traveler) => traveler.position >= parsed.travelerCount)
          .map((traveler) => traveler.id)
      )
      const retiredFiles = detail.documents.filter(
        (doc) => doc.travelerId && removedIds.has(doc.travelerId)
      )
      if (retiredFiles.length > 0) {
        // The traveler FK cascades. Preserve keys before that deletion so
        // removed travelers' private files remain recoverable for cleanup.
        await addVisaApplicationEvent(
          {
            applicationId: parsed.applicationId,
            actorUserId: input.actorUserId,
            eventType: "traveler_documents_retired",
            metadata: {
              files: retiredFiles.map((doc) => ({
                documentId: doc.id,
                objectKey: doc.objectKey,
              })),
            },
          },
          tx
        )
      }
      await updateVisaApplication(
        parsed.applicationId,
        {
          entryDate: parsed.entryDate,
          travelerCount: parsed.travelerCount,
          ...(changedCount
            ? {
                pricingSnapshot: createApplicationPricing(
                  detail.application.listingSnapshot,
                  parsed.travelerCount
                ),
              }
            : {}),
        },
        tx
      )
      await tx
        .delete(visaApplicationTravelers)
        .where(
          and(
            eq(visaApplicationTravelers.applicationId, parsed.applicationId),
            gte(visaApplicationTravelers.position, parsed.travelerCount)
          )
        )
      await addVisaApplicationEvent(
        {
          applicationId: parsed.applicationId,
          actorUserId: input.actorUserId,
          eventType: "trip_saved",
          metadata: { travelerCount: parsed.travelerCount },
        },
        tx
      )
    }
  )
}

export async function saveVisaApplicationTravelerDetails(
  input: { actorUserId: string } & import("zod").z.input<
    typeof travelersStepSchema
  >
) {
  const parsed = travelersStepSchema.parse(input)
  await withEditableVisaApplication(
    parsed.applicationId,
    input.actorUserId,
    async (tx, detail) => {
      if (parsed.travelers.length !== detail.application.travelerCount) {
        throw new VisaApplicationError(
          "Add details for every traveler before continuing."
        )
      }
      if (!detail.application.entryDate)
        throw new VisaApplicationError("Complete the trip details first.")
      for (const traveler of parsed.travelers) {
        if (traveler.nationalityCode !== detail.application.nationalityCode) {
          throw new VisaApplicationError(
            "Each traveler's passport country must match this visa listing."
          )
        }
        if (traveler.passportExpiryDate <= detail.application.entryDate) {
          throw new VisaApplicationError(
            "Each passport must be valid after the entry date."
          )
        }
      }
      await saveVisaApplicationTravelers(
        parsed.applicationId,
        parsed.travelers,
        tx
      )
      await addVisaApplicationEvent(
        {
          applicationId: parsed.applicationId,
          actorUserId: input.actorUserId,
          eventType: "travelers_saved",
        },
        tx
      )
    }
  )
}

export async function saveVisaApplicationContact(input: {
  actorUserId: string
  applicationId: string
  contactEmail: string
  contactPhone: string
}) {
  const parsed = contactStepSchema.parse(input)
  await withEditableVisaApplication(
    parsed.applicationId,
    input.actorUserId,
    async (tx) => {
      await updateVisaApplication(
        parsed.applicationId,
        {
          contactEmail: parsed.contactEmail,
          contactPhone: parsed.contactPhone,
        },
        tx
      )
      await addVisaApplicationEvent(
        {
          applicationId: parsed.applicationId,
          actorUserId: input.actorUserId,
          eventType: "contact_saved",
        },
        tx
      )
    }
  )
}

export async function submitVisaApplication(
  input: { actorUserId: string } & import("zod").z.input<
    typeof reviewConsentSchema
  >
) {
  const parsed = reviewConsentSchema.parse(input)
  const application = await withEditableVisaApplication(
    parsed.applicationId,
    input.actorUserId,
    async (tx, detail) => {
      if (getVisaApplicationResumeStep(detail) !== "review") {
        throw new VisaApplicationError(
          "Complete the required information and documents before submitting."
        )
      }
      tripStepSchema.parse({
        ...detail.application,
        applicationId: detail.application.id,
      })
      contactStepSchema.parse({
        ...detail.application,
        applicationId: detail.application.id,
      })
      travelersStepSchema.parse({
        applicationId: detail.application.id,
        travelers: detail.travelers,
      })
      if (
        detail.travelers.some(
          (t) => t.passportExpiryDate <= detail.application.entryDate!
        )
      ) {
        throw new VisaApplicationError(
          "Each passport must be valid after the entry date."
        )
      }
      if (
        detail.application.pricingSnapshot.pricedAt !== parsed.expectedPricedAt
      ) {
        throw new VisaApplicationError(
          "The traveler count changed. Review the updated estimate."
        )
      }
      return submitVisaApplicationRecord(
        {
          applicationId: parsed.applicationId,
          actorUserId: input.actorUserId,
          pricingSnapshot: createApplicationPricing(
            detail.application.listingSnapshot,
            detail.application.travelerCount,
            detail.application.pricingSnapshot.pricedAt
          ),
        },
        tx
      )
    }
  )
  await enqueueVisaSubmissionNotification(
    application,
    application.pricingSnapshot
  ).catch(() => console.error("Visa request notification enqueue failed"))
  return application
}
