"use client"

import Link, { useLinkStatus } from "next/link"
import { PlusIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface PendingLinkButtonProps {
  href: string
  children: ReactNode
  pendingLabel: string
  icon?: "plus"
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}

export function PendingLinkButton({
  href,
  children,
  pendingLabel,
  icon,
  variant,
  size,
  className,
}: PendingLinkButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      nativeButton={false}
      render={<Link href={href} />}
    >
      <PendingLinkContent pendingLabel={pendingLabel} icon={icon}>
        {children}
      </PendingLinkContent>
    </Button>
  )
}

function PendingLinkContent({
  children,
  pendingLabel,
  icon,
}: {
  children: ReactNode
  pendingLabel: string
  icon?: "plus"
}) {
  const { pending } = useLinkStatus()

  return (
    <>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : icon === "plus" ? (
        <PlusIcon data-icon="inline-start" />
      ) : null}
      {pending ? pendingLabel : children}
    </>
  )
}
