"use client"

import { useState } from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ConfirmModal } from "@/components/global-modal"
import { ChevronsUpDownIcon, SettingsIcon, LogOutIcon } from "lucide-react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouter()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
              }
            >
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-fit"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar>
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    if (isMobile) setOpenMobile(false)
                    router.push('/account')
                  }}
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogoutModal(true)}>
                <LogOutIcon className="mr-2 h-4 w-4 text-red-500" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ConfirmModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        variant="danger"
        icon={<LogOutIcon className="size-5 text-red-600 dark:text-red-400" />}
        title="Confirm Sign Out"
        description="Are you sure you want to end your session?"
        confirmText="Log out"
        onConfirm={() => signOut({ callbackUrl: "/login" })}
      >
        <div className="text-xs text-muted-foreground leading-relaxed">
          You will be logged out of <strong className="text-foreground font-semibold">{user.email}</strong> and returned to the login portal.
        </div>
      </ConfirmModal>
    </>
  )
}
