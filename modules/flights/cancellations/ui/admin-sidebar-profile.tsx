"use client"

import { UserButton } from "@clerk/nextjs"

interface AdminSidebarProfileProps {
  adminEmail?: string | null
}

export function AdminSidebarProfile({ adminEmail }: AdminSidebarProfileProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 shadow-sm">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "size-10",
          },
        }}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {adminEmail ?? "Admin"}
        </p>
        <p className="text-xs text-muted-foreground">Active admin</p>
      </div>
    </div>
  )
}
