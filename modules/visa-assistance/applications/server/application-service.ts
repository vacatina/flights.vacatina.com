import "server-only"

import { formatSerializedMoney } from "@/modules/currency/domain"
import { listActiveAdminAlertRecipients } from "@/modules/flights/cancellations/server/admin-notifications"
import { createEmailHash } from "@/modules/flights/orders/server/identity"
import { enqueueNotification } from "@/modules/notifications/server"
import type { VisaDocumentResult } from "@/modules/visa-assistance/domain"
import { getVisaAssistanceResult } from "@/modules/visa-assistance/server"
import {
  contactStepSchema,
  createVisaApplicationSchema,
  areVisaApplicationPricesEquivalent,
  isVisaApplicationEditable,
  reviewConsentSchema,
  travelersStepSchema,
  tripStepSchema,
  type VisaApplicationDetail,
  type VisaApplicationPricingSnapshot,
} from "@/modules/visa-assistance/applications/domain"
import {
  addVisaApplicationEvent,
  createVisaApplication,
  getVisaApplicationDetail,
  listOwnedVisaApplications,
  saveVisaApplicationTravelers,
  submitVisaApplicationRecord,
  updateVisaApplication,
} from "@/modules/visa-assistance/applications/server/application-repository"
import {
  createVisaApplicationId,
  createVisaApplicationReference,
} from "@/modules/visa-assistance/applications/server/ids"

export async function createVisaApplicationDraft(input: {
  actorUserId: string
  contactEmail: string | null
  nationalityCode: string
  destinationCode: string
  visaTypeId: string
  providerProductId: string | null
}) {
  const parsed = createVisaApplicationSchema.parse(input)
  const option = await findSelectedVisaOption(parsed)
  const pricingSnapshot = createPricingSnapshot(option)

  return createVisaApplication({
    id: createVisaApplicationId(),
    reference: createVisaApplicationReference(),
    ownerUserId: input.actorUserId,
    nationalityCode: parsed.nationalityCode,
    destinationCode: parsed.destinationCode,
    visaTypeId: parsed.visaTypeId,
    providerProductId: parsed.providerProductId,
    visaName:
      option.document.name ??
      option.product?.product_name ??
      option.product?.name ??
      "Travel visa",
    contactEmail: input.contactEmail,
    pricingSnapshot,
  })
}

export async function getOwnedVisaApplication(
  applicationId: string,
  actorUserId: string
): Promise<VisaApplicationDetail> {
  const detail = await getVisaApplicationDetail(applicationId)

  if (!detail || detail.application.ownerUserId !== actorUserId) {
    throw new Error("Visa request not found.")
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
  const detail = await requireEditableApplication(
    parsed.applicationId,
    input.actorUserId
  )

  await updateVisaApplication(parsed.applicationId, {
    entryDate: parsed.entryDate,
    travelerCount: parsed.travelerCount,
  })
  await addVisaApplicationEvent({
    applicationId: parsed.applicationId,
    actorUserId: input.actorUserId,
    eventType: "trip_saved",
    metadata: {
      travelerCount: parsed.travelerCount,
      previousTravelerCount: detail.application.travelerCount,
    },
  })
}

export async function saveVisaApplicationTravelerDetails(input: {
  actorUserId: string
  applicationId: string
  travelers: Array<{
    id?: string
    position: number
    title: "Mr" | "Mrs" | "Ms" | "Miss" | "Mx"
    firstName: string
    lastName: string
    nationalityCode: string
    dateOfBirth: string
    passportNumber: string
    passportExpiryDate: string
  }>
}) {
  const parsed = travelersStepSchema.parse(input)
  const detail = await requireEditableApplication(
    parsed.applicationId,
    input.actorUserId
  )

  if (parsed.travelers.length !== detail.application.travelerCount) {
    throw new Error("Add details for every traveler before continuing.")
  }

  if (!detail.application.entryDate) {
    throw new Error("Complete the trip details before adding travelers.")
  }

  for (const traveler of parsed.travelers) {
    if (traveler.passportExpiryDate <= detail.application.entryDate) {
      throw new Error(
        `Traveler ${traveler.position + 1}'s passport must be valid after ` +
          "the entry date."
      )
    }
  }

  await saveVisaApplicationTravelers(
    parsed.applicationId,
    parsed.travelers.map((traveler) => ({
      position: traveler.position,
      title: traveler.title,
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      nationalityCode: traveler.nationalityCode,
      dateOfBirth: traveler.dateOfBirth,
      passportNumber: traveler.passportNumber,
      passportExpiryDate: traveler.passportExpiryDate,
    }))
  )
  await addVisaApplicationEvent({
    applicationId: parsed.applicationId,
    actorUserId: input.actorUserId,
    eventType: "travelers_saved",
    metadata: { travelerCount: parsed.travelers.length },
  })
}

export async function saveVisaApplicationContact(input: {
  actorUserId: string
  applicationId: string
  contactEmail: string
  contactPhone: string
}) {
  const parsed = contactStepSchema.parse(input)
  await requireEditableApplication(parsed.applicationId, input.actorUserId)

  await updateVisaApplication(parsed.applicationId, {
    contactEmail: parsed.contactEmail,
    contactPhone: parsed.contactPhone,
  })
  await addVisaApplicationEvent({
    applicationId: parsed.applicationId,
    actorUserId: input.actorUserId,
    eventType: "contact_saved",
  })
}

export async function refreshVisaApplicationPricing(
  applicationId: string,
  actorUserId: string
) {
  const detail = await getOwnedVisaApplication(applicationId, actorUserId)
  const option = await findSelectedVisaOption({
    nationalityCode: detail.application.nationalityCode,
    destinationCode: detail.application.destinationCode,
    visaTypeId: detail.application.visaTypeId,
    providerProductId: detail.application.providerProductId,
  })
  const pricingSnapshot = createPricingSnapshot(option)

  if (isVisaApplicationEditable(detail.application.status)) {
    await updateVisaApplication(applicationId, { pricingSnapshot })
  }

  return pricingSnapshot
}

export async function submitVisaApplication(input: {
  actorUserId: string
  applicationId: string
  expectedPricedAt: string
  informationAccurate: boolean
  termsAccepted: boolean
  privacyAccepted: boolean
}) {
  const parsed = reviewConsentSchema.parse(input)
  const detail = await requireEditableApplication(
    parsed.applicationId,
    input.actorUserId
  )

  assertApplicationComplete(detail)
  const reviewedPricing = detail.application.pricingSnapshot

  if (
    !reviewedPricing ||
    reviewedPricing.pricedAt !== parsed.expectedPricedAt
  ) {
    throw new Error("The estimate was refreshed. Review it before submitting.")
  }

  const pricingSnapshot = await refreshVisaApplicationPricing(
    parsed.applicationId,
    input.actorUserId
  )

  if (!areVisaApplicationPricesEquivalent(reviewedPricing, pricingSnapshot)) {
    throw new Error(
      "The estimated price changed. Review the new estimate and submit again."
    )
  }

  const application = await submitVisaApplicationRecord({
    applicationId: parsed.applicationId,
    actorUserId: input.actorUserId,
    pricingSnapshot,
  })

  await enqueueVisaSubmissionNotification(application, pricingSnapshot)
  return application
}

async function enqueueVisaSubmissionNotification(
  application: Awaited<ReturnType<typeof submitVisaApplicationRecord>>,
  pricingSnapshot: VisaApplicationPricingSnapshot
) {
  if (!application.contactEmail) return
  const payload = {
    bookingReference: application.reference,
    routeLabel: `${application.nationalityCode} to ${application.destinationCode}`,
    amountLabel: pricingSnapshot.totalSellMoney
      ? formatSerializedMoney(pricingSnapshot.totalSellMoney)
      : "Estimate unavailable",
    statusLabel: "Received",
    applicationId: application.id,
  }
  let enqueueFailed = false

  try {
    await enqueueNotification({
      eventType: "visa_request_received",
      flightOrderId: null,
      checkoutSessionId: null,
      bookingReference: application.reference,
      recipientEmail: application.contactEmail,
      recipientEmailHash: createEmailHash(application.contactEmail),
      payload,
    })
  } catch {
    enqueueFailed = true
  }

  try {
    const recipients = await listActiveAdminAlertRecipients()
    await Promise.all(
      recipients.map((recipient) =>
        enqueueNotification({
          eventType: "visa_request_received",
          flightOrderId: null,
          checkoutSessionId: null,
          bookingReference: application.reference,
          recipientEmail: recipient.email,
          recipientEmailHash: createEmailHash(recipient.email),
          payload: { ...payload, recipientRole: "admin" },
        })
      )
    )
  } catch {
    enqueueFailed = true
  }

  if (enqueueFailed) {
    await addVisaApplicationEvent({
      applicationId: application.id,
      actorUserId: null,
      eventType: "notification_enqueue_failed",
    })
  }
}

function assertApplicationComplete(detail: VisaApplicationDetail) {
  const { application, travelers, documents } = detail

  if (!application.entryDate) {
    throw new Error("Complete the trip details before submitting.")
  }

  if (!application.contactEmail || !application.contactPhone) {
    throw new Error("Complete the contact details before submitting.")
  }

  if (travelers.length !== application.travelerCount) {
    throw new Error("Complete every traveler before submitting.")
  }

  const travelersWithPassports = new Set(
    documents
      .filter(
        (document) =>
          document.status === "uploaded" &&
          document.documentType === "passport_bio_page"
      )
      .map((document) => document.travelerId)
  )
  const missingPassport = travelers.some(
    (traveler) => !travelersWithPassports.has(traveler.id)
  )

  if (missingPassport) {
    throw new Error("Upload a passport bio page for every traveler.")
  }
}

async function requireEditableApplication(
  applicationId: string,
  actorUserId: string
) {
  const detail = await getOwnedVisaApplication(applicationId, actorUserId)

  if (!isVisaApplicationEditable(detail.application.status)) {
    throw new Error("This visa request can no longer be edited.")
  }

  return detail
}

async function findSelectedVisaOption(input: {
  nationalityCode: string
  destinationCode: string
  visaTypeId: string
  providerProductId: string | null
}) {
  const result = await getVisaAssistanceResult(
    input.nationalityCode,
    input.destinationCode
  )
  const option = result.eligibleDocuments.find((candidate) => {
    const visaTypeId = normalizeId(
      candidate.document.visa_type_id ?? candidate.product?.id
    )
    const providerProductId = normalizeId(
      candidate.product?.product_id ?? candidate.document.product_id
    )

    return (
      visaTypeId === input.visaTypeId &&
      providerProductId === input.providerProductId
    )
  })

  if (!option?.product) {
    throw new Error("This visa option is no longer available.")
  }

  return option
}

function createPricingSnapshot(
  option: VisaDocumentResult
): VisaApplicationPricingSnapshot {
  const pricing = option.pricing ?? {
    processingFee: null,
    governmentFee: null,
    totalSellMoney: null,
  }

  return {
    ...pricing,
    pricedAt: new Date().toISOString(),
  }
}

function normalizeId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }

  return String(value).trim() || null
}
