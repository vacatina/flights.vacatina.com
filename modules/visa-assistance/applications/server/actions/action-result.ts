import { ZodError } from "zod"

import type { VisaApplicationActionFailure } from "@/modules/visa-assistance/applications/domain"

export function toVisaApplicationActionError(
  error: unknown
): VisaApplicationActionFailure {
  if (error instanceof ZodError) {
    return {
      ok: false,
      message: error.issues[0]?.message ?? "Check the form and try again.",
    }
  }

  if (error instanceof Error) {
    return { ok: false, message: error.message }
  }

  return {
    ok: false,
    message: "Something went wrong. Please try again.",
  }
}
