"use client"

import * as React from "react"
import { FileTextIcon, UsersIcon, PenToolIcon, ImageIcon, LayoutDashboardIcon, WavesHorizontalIcon, Bell } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
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
      url: "#",
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 p-2 px-3 hover:bg-muted/50 rounded-lg transition-colors">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboardIcon className="size-4" />
          </div>
          <span className="truncate font-bold">Zoro CMS</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
