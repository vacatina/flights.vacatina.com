"use client"

import { UserButton } from "@clerk/nextjs"

interface AdminSidebarProfileProps {
  adminEmail?: string | null
}

export function AdminSidebarProfile({ adminEmail }: AdminSidebarProfileProps) {
  return (
    <div className="flex items-center gap-3 border-t border-[#e8ebf0] px-1 pt-4">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "size-9",
          },
        }}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#172033]">
          {adminEmail ?? "Admin"}
        </p>
        <p className="text-xs text-[#7b8492]">Active admin</p>
      </div>
    </div>
  )
}
