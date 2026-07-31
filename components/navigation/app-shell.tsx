"use client"

import { usePathname } from "next/navigation"

import { SiteFooter } from "@/components/navigation/site-footer"
import { SiteNavbar } from "@/components/navigation/site-navbar"
import { TopLoader } from "@/components/ui/top-loader"

interface AppShellProps {
  clerkEnabled: boolean
  children: React.ReactNode
}

export function AppShell({ clerkEnabled, children }: AppShellProps) {
  const pathname = usePathname()
  const adminRoute = pathname === "/admin" || pathname.startsWith("/admin/")

  return (
    <>
      <TopLoader />
      <div id="top" className="min-h-svh">
        {adminRoute ? null : <SiteNavbar clerkEnabled={clerkEnabled} />}
        {children}
        {adminRoute ? null : <SiteFooter />}
      </div>
    </>
  )
}
