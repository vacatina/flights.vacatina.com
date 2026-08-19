/* eslint-disable @next/next/no-page-custom-font */
import { Google_Sans_Flex as Figtree, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import { cookies } from "next/headers"
import { after } from "next/server"

import "./globals.css"
import { cn } from "@/lib/utils"
import { isClerkConfigured } from "@/modules/auth/server/config"
import type { Metadata } from "next"
import { SiteFooter } from "@/components/navigation/site-footer"
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
      <div className="flex min-h-svh flex-col">
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
        {clerkEnabled ? (
          <ClerkProvider
            appearance={{
              theme: shadcn,
              variables: {
                fontFamily: "var(--font-sans)",
              },
              elements: {
                formButtonPrimary:
                  "!h-14 rounded-[10px] !text-[16px] font-medium",
                formFieldInput:
                  "!h-14 !min-h-[56px] rounded-xl !bg-background !border-input !text-foreground !placeholder:text-muted-foreground !text-base font-medium",
                formFieldLabel:
                  "!text-[13px] !font-medium uppercase tracking-[0.08em] !text-muted-foreground mb-2",
                socialButtonsBlockButton:
                  "!h-14 rounded-[10px] !bg-background border border-border text-foreground hover:bg-muted",
                socialButtonsBlockButtonText: "font-medium !text-[16px]",
                dividerText: "!text-muted-foreground",
                headerSubtitle: "!text-muted-foreground",
                footerActionText: "!text-muted-foreground",
                rootBox: "!w-full !shadow-none",
                cardBox: "!w-full !shadow-none",
                card: "!w-full rounded-[12px] !shadow-none border-none",
                header: "!px-5 sm:!px-10 !pt-6 sm:!pt-10",
                footer: "!px-5 sm:!px-10",
              },
            }}
          >
            {appShell}
          </ClerkProvider>
        ) : (
          appShell
        )}
      </body>
    </html>
  )
}
