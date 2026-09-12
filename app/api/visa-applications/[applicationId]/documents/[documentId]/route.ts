import { currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { isActiveAdminMetadata } from "@/modules/flights/cancellations/server/admin-guard"
import {
  getVisaDocumentDownloadUrl,
  getVisaApplicationActor,
} from "@/modules/visa-assistance/applications/server"
import { getVisaApplicationDetail } from "@/modules/visa-assistance/applications/server/application-repository"

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ applicationId: string; documentId: string }>
  }
) {
  const { applicationId, documentId } = await context.params
  const [clerkUser, actor, detail] = await Promise.all([
    currentUser(),
    getVisaApplicationActor(),
    getVisaApplicationDetail(applicationId),
  ])
  const ownsApplication = Boolean(
    actor && detail?.application.ownerUserId === actor.appUserId
  )
  const isAdmin = isActiveAdminMetadata(clerkUser?.publicMetadata)

  if (!detail || (!ownsApplication && !isAdmin)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const downloadUrl = await getVisaDocumentDownloadUrl({
      applicationId,
      documentId,
    })
    return NextResponse.redirect(downloadUrl)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
