import "server-only"
import { formatSerializedMoney } from "@/modules/currency/domain"
import { listActiveAdminAlertRecipients } from "@/modules/flights/cancellations/server/admin-notifications"
import { createEmailHash } from "@/modules/flights/orders/server/identity"
import { enqueueNotification } from "@/modules/notifications/server"
import type { VisaApplicationPricingSnapshot } from "../domain"
import {
  addVisaApplicationEvent,
  submitVisaApplicationRecord,
} from "./application-repository"
export async function enqueueVisaSubmissionNotification(
  application: Awaited<ReturnType<typeof submitVisaApplicationRecord>>,
  pricingSnapshot: VisaApplicationPricingSnapshot
) {
  if (!application.contactEmail) return
  const payload = {
    bookingReference: application.reference,
    routeLabel: `${application.nationalityCode} to ${application.destinationCode}`,
    amountLabel: pricingSnapshot.totalMoney
      ? formatSerializedMoney(pricingSnapshot.totalMoney)
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
