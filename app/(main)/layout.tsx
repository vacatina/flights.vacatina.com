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
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-[10px] bg-white px-4 py-3 text-sm font-semibold text-[#1B1464] shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <div id="top" className="flex-1">
        <SiteNavbar clerkEnabled={clerkEnabled} />
        {children}
      </div>
    </>
  )
}
