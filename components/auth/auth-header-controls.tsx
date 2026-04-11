"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Show, UserButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

export function AuthHeaderControls() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const redirectUrl = buildRedirectUrl(pathname, searchParams.toString())
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`

  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <Button variant="ghost" size="sm" render={<Link href={signInHref} />}>
          Sign in
        </Button>
        <Button size="sm" render={<Link href={signUpHref} />}>
          Create account
        </Button>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  )
}

function buildRedirectUrl(pathname: string | null, search: string) {
  const normalizedPathname = pathname || "/"

  if (!search) {
    return normalizedPathname
  }

  return `${normalizedPathname}?${search}`
}
