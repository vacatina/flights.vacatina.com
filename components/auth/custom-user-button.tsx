"use client"

import { useState } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import {
  CircleHelpIcon,
  HeartIcon,
  LogOutIcon,
  SettingsIcon,
  ShoppingBagIcon,
  StampIcon,
  TicketsPlaneIcon,
  UserRoundIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function CustomUserButton() {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const [isSignOutConfirm, setIsSignOutConfirm] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!user) return null

  const navigate = (href: string) => {
    window.location.assign(href)
  }

  const handleSignOut = async (event: React.MouseEvent) => {
    event.preventDefault()
    setIsSigningOut(true)
    await signOut()
    setIsSigningOut(false)
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setIsSignOutConfirm(false)
      }}
    >
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white">
        <Avatar className="size-10 border border-white/30">
          <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
          <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-[300px]">
        {isSignOutConfirm ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Sign Out</h4>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to sign out?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSignOutConfirm(false)}
                disabled={isSigningOut}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Signing out...
                  </>
                ) : (
                  "Sign out"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 py-3 font-normal">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border border-border">
                    <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                    <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium leading-none">
                      {user.fullName}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {user.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <MenuItem
              label="My Trips"
              icon={TicketsPlaneIcon}
              onClick={() => navigate("/bookings")}
            />
            <MenuItem
              label="Visa Applications"
              icon={StampIcon}
              onClick={() => navigate("/visa-requests")}
            />
            <MenuItem
              label="Saved / Favorites"
              icon={HeartIcon}
              onClick={() => navigate("/bookings")}
            />
            <MenuItem
              label="Trip Bucket"
              icon={ShoppingBagIcon}
              onClick={() => navigate("/bookings")}
            />

            <DropdownMenuSeparator />

            <MenuItem
              label="Profile & Travelers"
              icon={UserRoundIcon}
              onClick={() => openUserProfile()}
            />
            <MenuItem
              label="Preferences"
              icon={SettingsIcon}
              onClick={() => openUserProfile()}
            />
            <MenuItem
              label="Help & Support"
              icon={CircleHelpIcon}
              onClick={() =>
                window.location.assign("mailto:info@vacatina.com?subject=Vacatina%20support")
              }
            />

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 px-3 py-3 text-[15px]"
              closeOnClick={false}
              onClick={() => setIsSignOutConfirm(true)}
            >
              <LogOutIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MenuItem({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  onClick: () => void
}) {
  return (
    <DropdownMenuItem
      className="cursor-pointer gap-2 px-3 py-3 text-[15px]"
      onClick={onClick}
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      {label}
    </DropdownMenuItem>
  )
}
