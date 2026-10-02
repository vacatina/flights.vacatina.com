import { ZodError } from "zod"
import { unstable_rethrow } from "next/navigation"
import { VisaApplicationError } from "../../domain/application-error"

import type { VisaApplicationActionFailure } from "@/modules/visa-assistance/applications/domain"

export function toVisaApplicationActionError(
  error: unknown
): VisaApplicationActionFailure {
  unstable_rethrow(error)
  if (error instanceof ZodError) {
    return {
      ok: false,
      message: error.issues[0]?.message ?? "Check the form and try again.",
    }
  }

  if (error instanceof VisaApplicationError) {
    return { ok: false, message: error.message }
  }

  console.error(
    "Visa request action failed",
    error instanceof Error ? error.name : "Unknown error"
  )
  return {
    ok: false,
    message: "Something went wrong. Please try again.",
  }
}
