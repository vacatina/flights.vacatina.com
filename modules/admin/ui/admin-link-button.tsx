"use client"

import Link, { useLinkStatus } from "next/link"
import type { ComponentProps, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function AdminLinkButton({
  href,
  children,
  pendingLabel = "Opening…",
  ...props
}: {
  href: string
  children: ReactNode
  pendingLabel?: string
} & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  return (
    <Button {...props} nativeButton={false} render={<Link href={href} />}>
      <LinkContent pendingLabel={pendingLabel}>{children}</LinkContent>
    </Button>
  )
}

function LinkContent({
  children,
  pendingLabel,
}: {
  children: ReactNode
  pendingLabel: string
}) {
  const { pending } = useLinkStatus()
  return (
    <>
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {pending ? pendingLabel : children}
    </>
  )
}
