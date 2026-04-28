import { NextResponse } from "next/server"

import {
  dispatchPendingNotifications,
  getNotificationsServerConfig,
} from "@/modules/notifications/server"
import { logFlightFlowError } from "@/lib/logging/flow-debug"

export async function POST(request: Request) {
  const config = getNotificationsServerConfig()
  const providedSecret = request.headers.get("x-dispatch-secret")

  if (config.dispatchSecret && providedSecret !== config.dispatchSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    )
  }

  try {
    const result = await dispatchPendingNotifications()
    return NextResponse.json({
      ok: true,
      data: result,
    })
  } catch (error) {
    logFlightFlowError("notifications.dispatch.route", "dispatch_failed", error)
    return NextResponse.json(
      {
        ok: false,
        error: "Could not dispatch notifications.",
      },
      {
        status: 500,
      }
    )
  }
}
