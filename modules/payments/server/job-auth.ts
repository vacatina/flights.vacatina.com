import "server-only"

export function isPaymentJobRequestAuthorized(headers: Headers) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authorization = headers.get("authorization")?.trim()

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return true
  }

  const jobSecret = process.env.PAYMENTS_JOB_SECRET?.trim()
  const providedJobSecret = headers.get("x-job-secret")?.trim()

  if (jobSecret && providedJobSecret === jobSecret) {
    return true
  }

  return process.env.NODE_ENV !== "production" && !cronSecret && !jobSecret
}
