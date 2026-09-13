"use client"

import * as React from "react"
import useSWR from "swr"
import { FileTextIcon, UsersIcon, PenToolIcon, ImageIcon, WavesHorizontalIcon, Bell, MessageSquare } from "lucide-react"

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
import { Skeleton } from "@/components/ui/skeleton"

import Link from "next/link"
import Image from "next/image"

const navItems = [
  {
    title: "Pages",
    url: "/webpages",
    icon: <FileTextIcon />,
  },
  {
    title: "Blogs",
    url: "/blogs",
    icon: <PenToolIcon />,
  },
  {
    title: "Comments",
    url: "/comments",
    icon: <MessageSquare />,
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
    icon: <WavesHorizontalIcon />,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: <Bell />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const { data: session, status } = useSession()
  const { data: badges } = useSWR<{
    unreadSubmissions: number;
    pendingComments: number;
  }>("/api/badges", {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const unreadSubmissionsCount = badges?.unreadSubmissions || 0;
  const unapprovedCommentsCount = badges?.pendingComments || 0;

  const filteredNavMain = React.useMemo(() => {
    return navItems
      .filter((item) => {
        if (item.title === "Users" || item.title === "Comments") {
          return session?.user?.role === "ADMIN"
        }
        return true
      })
      .map((item) => {
        if (item.title === "Notifications") {
          return { ...item, badge: unreadSubmissionsCount }
        }
        if (item.title === "Comments") {
          return { ...item, badge: unapprovedCommentsCount }
        }
        return item
      })
  }, [session, unreadSubmissionsCount, unapprovedCommentsCount])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link 
          href="/" 
          className={`flex items-center hover:bg-muted/50 rounded-sm transition-all overflow-hidden ${
            state === "collapsed" ? "justify-center p-2" : "gap-3 p-2 px-2"
          }`}
        >
          <div className={`relative flex aspect-square shrink-0 items-center justify-center rounded-sm overflow-hidden ${
            state === "collapsed" ? "size-8" : "size-10"
          }`}>
            <Image
              src="/ys-icon.png"
              alt="YS Innovations"
              width={40}
              height={40}
              className="w-full h-full object-contain rounded-sm"
              priority
            />
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
        {status === "loading" ? (
          <div className="p-4 space-y-4 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-sm" />
            ))}
          </div>
        ) : (
          <NavMain items={filteredNavMain} />
        )}
      </SidebarContent>
      <SidebarFooter>
        {status === "loading" ? (
          <div className="p-2 flex items-center gap-2 w-full">
            <Skeleton className="h-8 w-8 rounded-sm shrink-0" />
            {state !== "collapsed" && (
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            )}
          </div>
        ) : (
          <NavUser user={{
            name: session?.user?.name || "User",
            email: session?.user?.email || "",
            avatar: session?.user?.image || "",
          }} />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
