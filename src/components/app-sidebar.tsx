"use client"

import * as React from "react"
import { FileTextIcon, UsersIcon, PenToolIcon, ImageIcon, LayoutDashboardIcon, WavesHorizontalIcon, Bell } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useSession } from "next-auth/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

import Link from "next/link"

const data = {
  user: {
    name: "Zoro Admin",
    email: "admin@zoro.cms",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Pages",
      url: "/webpages",
      icon: <FileTextIcon />,
    },
    {
      title: "Blogs",
      url: "#",
      icon: <PenToolIcon />,
    },
    {
      title: "Users",
      url: "/users",
      icon: <UsersIcon />,
    },
    {
      title: "Media",
      url: "/media",
      icon: <ImageIcon />,
    },
    {
      title: "Redirection",
      url: "/redirections",
      icon: <WavesHorizontalIcon   />,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: <Bell   />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const { data: session } = useSession()
  
  const filteredNavMain = React.useMemo(() => {
    return data.navMain.filter((item) => {
      if (item.title === "Users") {
        return session?.user?.role === "ADMIN"
      }
      return true
    })
  }, [session])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link 
          href="/" 
          className={`flex items-center hover:bg-muted/50 rounded-xl transition-all overflow-hidden ${
            state === "collapsed" ? "justify-center p-2" : "gap-3 p-2 px-2"
          }`}
        >
          <div className={`flex aspect-square shrink-0 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-sm ${
            state === "collapsed" ? "size-8" : "size-10"
          }`}>
            <LayoutDashboardIcon className={state === "collapsed" ? "size-4" : "size-5"} />
          </div>
          
          {state !== "collapsed" && (
            <div className="flex flex-col truncate">
              <span className="truncate text-sm font-bold text-foreground tracking-tight">YS Innovations</span>
              <span className="truncate text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Admin Management</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: session?.user?.name || "User",
          email: session?.user?.email || "",
          avatar: session?.user?.image || "",
        }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
