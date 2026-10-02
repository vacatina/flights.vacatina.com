"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import styles from "./holiday-motion.module.css"

export function HolidayReveal({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const target = element.current
    if (
      !target ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          target.dataset.visible = "true"
          observer.disconnect()
        }
      },
      { threshold: 0.08 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={element} className={cn(styles.reveal, className)}>
      {children}
    </div>
  )
}
