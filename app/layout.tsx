/* eslint-disable @next/next/no-page-custom-font */
import { Google_Sans_Flex as Figtree, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { cookies } from "next/headers"
import { after } from "next/server"

import "./globals.css"
import { AppShell } from "@/components/navigation/app-shell"
import { cn } from "@/lib/utils"
import { isClerkConfigured } from "@/modules/auth/server/config"
import type { Metadata } from "next"
import {
  DISPLAY_CURRENCY_COOKIE_NAME,
  parseDisplayCurrency,
} from "@/modules/currency/domain"
import { getDisplayFxSnapshot } from "@/modules/currency/server"
import { CurrencyProvider } from "@/modules/currency/ui"

const figtreeHeading = Figtree({
  subsets: ["latin"],
  variable: "--font-heading",
})

const inter = Figtree({ subsets: ["latin"], variable: "--font-sans" })

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
      <AppShell clerkEnabled={clerkEnabled}>{children}</AppShell>
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=swap"
        />
      </head>
      <body>
        {clerkEnabled ? <ClerkProvider>{appShell}</ClerkProvider> : appShell}
      </body>
    </html>
  )
}
