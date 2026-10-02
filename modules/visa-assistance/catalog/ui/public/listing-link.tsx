"use client"

import Link, { useLinkStatus } from "next/link"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function ListingLink({ href }: { href: string }) {
  return (
    <Button
      role="link"
      size="lg"
      nativeButton={false}
      render={<Link href={href} />}
      className="w-full rounded-full shadow-[0_8px_18px_-10px_var(--primary)]"
    >
      <LinkLabel />
    </Button>
  )
}

function LinkLabel() {
  const { pending } = useLinkStatus()
  return pending ? (
    <>
      <Spinner data-icon="inline-start" />
      Opening details…
    </>
  ) : (
    "View visa details"
  )
}
