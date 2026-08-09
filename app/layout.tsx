import { Google_Sans_Flex as Figtree, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { cookies } from "next/headers"
import { after } from "next/server"

import "./globals.css"
import { SiteFooter } from "@/components/navigation/site-footer"
import { SiteNavbar } from "@/components/navigation/site-navbar"
import { cn } from "@/lib/utils"
import { isClerkConfigured } from "@/modules/auth/server/config"
import type { Metadata } from "next"
import { TopLoader } from "@/components/ui/top-loader"
import {
  DISPLAY_CURRENCY_COOKIE_NAME,
  parseDisplayCurrency,
} from "@/modules/currency/domain"
import { getDisplayFxSnapshot } from "@/modules/currency/server"
import { CurrencyProvider } from "@/modules/currency/ui"

const figtreeHeading = Figtree({
  subsets: ["latin"],
  variable: "--font-heading",
  adjustFontFallback: false,
})

const inter = Figtree({ subsets: ["latin"], variable: "--font-sans", adjustFontFallback: false })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Vacatina Flights",
  description:
    "Search, compare, and book international flights with flexible fare options and streamlined checkout.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkEnabled = isClerkConfigured()
  const cookieStore = await cookies()
  const initialCurrency = parseDisplayCurrency(
    cookieStore.get(DISPLAY_CURRENCY_COOKIE_NAME)?.value
  )
  const initialFxSnapshot = await getDisplayFxSnapshot({
    scheduleRefresh: (task) => after(task),
  })

  const appShell = (
    <CurrencyProvider
      initialCurrency={initialCurrency}
      initialFxSnapshot={initialFxSnapshot}
    >
      <TopLoader />
      <div id="top" className="min-h-svh">
        <SiteNavbar clerkEnabled={clerkEnabled} />
        {children}
        <SiteFooter />
      </div>
    </CurrencyProvider>
  )

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
        figtreeHeading.variable
      )}
    >
      <body>
        {clerkEnabled ? <ClerkProvider>{appShell}</ClerkProvider> : appShell}
      </body>
    </html>
  )
}
