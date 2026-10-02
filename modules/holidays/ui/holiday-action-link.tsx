"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { buttonVariants } from "@/components/ui/button"

export function HolidayActionLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={buttonVariants({ className: "self-start rounded-full" })}
    >
      {children}
    </Link>
  )
}
