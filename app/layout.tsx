import {
  Google_Sans_Flex as Figtree,
  Geist_Mono,
} from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"

import "./globals.css"
import { SiteFooter } from "@/components/navigation/site-footer"
import { SiteNavbar } from "@/components/navigation/site-navbar"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { isClerkConfigured } from "@/modules/auth/server/config"
import type { Metadata } from "next"

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkEnabled = isClerkConfigured()

  const appShell = (
    <ThemeProvider>
      <div id="top" className="min-h-svh">
        <SiteNavbar clerkEnabled={clerkEnabled} />
        {children}
        <SiteFooter />
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
