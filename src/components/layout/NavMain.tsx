"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ChevronRightIcon } from "lucide-react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    badge?: number | string
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile

  const handleItemClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isItemActive = pathname === item.url;
          const isAnySubActive = item.items?.some(
            (subItem) =>
              pathname === subItem.url ||
              (subItem.url !== "/blogs" && pathname.startsWith(subItem.url + "/")) ||
              (subItem.url === "/blogs" && (pathname === "/blogs" || pathname.startsWith("/blogs/")))
          );

          if (item.items && item.items.length > 0) {
            // When sidebar is collapsed: Show rich nested menu on hover instead of plain tooltip
            if (isCollapsed) {
              return (
                <SidebarMenuItem key={item.title}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      openOnHover
                      delay={50}
                      closeDelay={150}
                      className="w-full focus:outline-none"
                      render={
                        <SidebarMenuButton
                          isActive={isItemActive || isAnySubActive}
                          className="cursor-pointer font-medium text-sidebar-foreground hover:bg-sidebar-accent"
                        />
                      }
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      sideOffset={8}
                      className="w-48 p-1.5 shadow-xl border border-border/80 bg-popover/95 backdrop-blur-md rounded-xl z-50"
                    >
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border/50 mb-1 flex items-center justify-between">
                        <span>{item.title}</span>
                        {item.badge !== undefined && Number(item.badge) > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-xs bg-primary text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.items.map((subItem) => {
                        const isSubActive =
                          pathname === subItem.url ||
                          (subItem.url !== "/blogs" && pathname.startsWith(subItem.url + "/"));
                        return (
                          <DropdownMenuItem
                            key={subItem.title}
                            render={<Link href={subItem.url} onClick={handleItemClick} />}
                            className={cn(
                              "cursor-pointer text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors",
                              isSubActive
                                ? "bg-accent font-semibold text-accent-foreground"
                                : "text-foreground hover:bg-accent/60"
                            )}
                          >
                            <span>{subItem.title}</span>
                            {isSubActive && (
                              <span className="size-1.5 rounded-full bg-primary" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              );
            }

            // When sidebar is expanded: Normal accordion collapsible
            return (
              <Collapsible
                key={item.title}
                defaultOpen={item.isActive ?? isAnySubActive ?? true}
                className="group/collapsible"
                render={<SidebarMenuItem />}
              >
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton 
                      tooltip={item.title} 
                      className="cursor-pointer font-medium text-sidebar-foreground hover:bg-sidebar-accent"
                    />
                  }
                >
                  {item.icon}
                  <span>{item.title}</span>
                  <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90 group-data-[open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton isActive={pathname === subItem.url} render={<Link href={subItem.url} onClick={handleItemClick} />}>
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} isActive={isItemActive} render={<Link href={item.url} onClick={handleItemClick} />}>
                {item.icon}
                <span className="flex-1">{item.title}</span>
                {item.badge !== undefined && Number(item.badge) > 0 && (
                  <span
                    className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-xs transition-colors shrink-0 ${
                      isItemActive
                        ? "bg-white text-black dark:bg-black dark:text-white shadow-xs"
                        : "bg-black text-white dark:bg-white dark:text-black"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
