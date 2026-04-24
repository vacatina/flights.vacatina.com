import {
  Figtree,
  Geist_Mono,
  Inter,
} from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Suspense } from "react"

import "./globals.css"
import { AuthHeaderControls } from "@/components/auth/auth-header-controls"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { isClerkConfigured } from "@/modules/auth/server/config"
import type { Metadata } from "next"

const figtreeHeading = Figtree({
  subsets: ["latin"],
  variable: "--font-heading",
})

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Vacatina Flights",
  description:
    "Search, compare, and book international flights with flexible fare options and streamlined checkout.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkEnabled = isClerkConfigured()

  const appShell = (
    <ThemeProvider>
      <div className="min-h-svh">
        {clerkEnabled ? (
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-end px-4 md:px-8">
              <Suspense fallback={<div className="h-8" />}>
                <AuthHeaderControls />
              </Suspense>
            </div>
          </header>
        ) : null}
        {children}
      </div>
    </ThemeProvider>
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
