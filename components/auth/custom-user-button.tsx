"use client"

import { useState } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { LogOutIcon, SettingsIcon } from "lucide-react"

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

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsSigningOut(true)
    await signOut()
    setIsSigningOut(false)
  }

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (!open) setIsSignOutConfirm(false)
    }}>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-9 border border-border">
            <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
            <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={12} className="w-[280px]">
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
                <DropdownMenuLabel className="font-normal py-3 px-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border border-border">
                      <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                      <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-[15px] font-medium leading-none">{user.fullName}</p>
                      <p className="text-sm leading-none text-muted-foreground">
                        {user.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 py-3 px-3 text-[15px]"
                onClick={() => openUserProfile()}
              >
                <SettingsIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                Manage account
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 py-3 px-3 text-[15px]"
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
