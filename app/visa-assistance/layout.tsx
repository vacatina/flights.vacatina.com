import { SiteNavbar } from "@/components/navigation/site-navbar"
import { TopLoader } from "@/components/ui/top-loader"
import { isClerkConfigured } from "@/modules/auth/server/config"

export default function VisaAssistanceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <TopLoader />
      <div id="top" className="flex-1">
        <SiteNavbar clerkEnabled={isClerkConfigured()} />
        {children}
      </div>
    </>
  )
}
