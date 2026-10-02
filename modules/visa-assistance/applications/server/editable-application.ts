import "server-only"
import { and, eq } from "drizzle-orm"
import { visaApplications } from "@/lib/db/schema"
import {
  isVisaApplicationEditable,
  type VisaApplicationDetail,
} from "../domain"
import { VisaApplicationError } from "../domain/application-error"
import { requireDb, type VisaTransaction } from "./application-database"
import { getVisaApplicationDetail } from "./application-queries"
export async function withEditableVisaApplication<T>(
  applicationId: string,
  ownerUserId: string,
  operation: (
    transaction: VisaTransaction,
    detail: VisaApplicationDetail
  ) => Promise<T>
): Promise<T> {
  return requireDb().transaction(async (transaction) => {
    const [application] = await transaction
      .select()
      .from(visaApplications)
      .where(
        and(
          eq(visaApplications.id, applicationId),
          eq(visaApplications.ownerUserId, ownerUserId)
        )
      )
      .for("update")
    if (!application) throw new VisaApplicationError("Visa request not found.")
    if (
      !isVisaApplicationEditable(application.status) ||
      application.submittedAt
    )
      throw new VisaApplicationError(
        "This visa request can no longer be edited."
      )
    const detail = await getVisaApplicationDetail(applicationId, transaction)
    if (!detail) throw new VisaApplicationError("Visa request not found.")
    return operation(transaction, detail)
  })
}
