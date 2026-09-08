import { SiteNavbar } from "@/components/navigation/site-navbar"
import { isClerkConfigured } from "@/modules/auth/server/config"
import { TopLoader } from "@/components/ui/top-loader"

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkEnabled = isClerkConfigured()

  return (
    <>
      <TopLoader />
      <div id="top" className="flex-1">
        <SiteNavbar clerkEnabled={clerkEnabled} />
        {children}
      </div>
    </>
  )
}
