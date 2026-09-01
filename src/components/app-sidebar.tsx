"use client"

import * as React from "react"
import { FileTextIcon, UsersIcon, PenToolIcon, ImageIcon, LayoutDashboardIcon, WavesHorizontalIcon, Bell, MessageSquare } from "lucide-react"

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
  const { data: session } = useSession()
  const [unreadSubmissionsCount, setUnreadSubmissionsCount] = React.useState<number>(0)
  const [unapprovedCommentsCount, setUnapprovedCommentsCount] = React.useState<number>(0)

  React.useEffect(() => {
    async function fetchCounts() {
      try {
        const [subRes, comRes] = await Promise.all([
          fetch("/api/forms/submissions?filter=unread", { cache: "no-store" }),
          fetch("/api/comments?filter=pending", { cache: "no-store" }),
        ]);

        if (subRes.ok) {
          const data = await subRes.json();
          setUnreadSubmissionsCount(data.unreadCount || 0);
        }
        if (comRes.ok) {
          const data = await comRes.json();
          setUnapprovedCommentsCount(data.unapprovedCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch sidebar counts", err);
      }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  const filteredNavMain = React.useMemo(() => {
    return navItems
      .filter((item) => {
        if (item.title === "Users") {
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
