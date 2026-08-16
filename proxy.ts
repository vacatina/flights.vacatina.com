import { NextResponse } from "next/server"
<<<<<<< HEAD
import { clerkMiddleware } from "@clerk/nextjs/server"
=======
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/results(.*)",
  "/booking/lookup",
  "/booking/lookup(.*)",
  "/booking(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  // These routes authenticate QStash/job requests themselves. Clerk must not
  // redirect machine-to-machine calls to a browser sign-in page.
  "/api/jobs/payments/outbox(.*)",
])
>>>>>>> 04df5bca7c89bcb70bf212b2400cf7fed5a68fdb

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
)

const middleware = clerkEnabled
  ? clerkMiddleware()
  : () => NextResponse.next()

export default middleware


export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
