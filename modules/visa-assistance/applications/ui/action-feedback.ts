import { unstable_rethrow } from "next/navigation"

/** Keep transport failures inline while preserving Next.js navigation signals. */
export async function withVisaActionFeedback<T>(action: () => Promise<T>) {
  try {
    return await action()
  } catch (error) {
    unstable_rethrow(error)
    return {
      ok: false as const,
      message:
        "We couldn't confirm the save. Your entries are still here. Please try again.",
    }
  }
}
