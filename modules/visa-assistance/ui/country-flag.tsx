import Image from "next/image"

import { cn } from "@/lib/utils"

interface CountryFlagProps {
  src: string
  className?: string
}

export function CountryFlag({ src, className }: CountryFlagProps) {
  return (
    <span
      className={cn(
        "relative block h-4 w-6 shrink-0 overflow-hidden rounded-[3px] bg-muted ring-1 ring-foreground/10",
        className
      )}
      aria-hidden="true"
    >
      <Image src={src} alt="" fill sizes="24px" className="object-contain" />
    </span>
  )
}
