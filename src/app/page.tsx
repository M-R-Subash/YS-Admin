"use client";

import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  PenToolIcon,
  CheckCircleIcon,
  ExternalLink,
  Bell,
  MessageSquare,
  LineChart,
  Search,
  Server,
  Mail,
} from "lucide-react";

import { Page } from "@/types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { DataTable } from "@/components/ui/data-table";
import { getWebpagesColumns } from "@/app/webpages/webpages-columns";

const QUICK_LINKS = [
  {
    title: "Google Analytics",
    subtitle: "Traffic & Performance",
    url: "https://analytics.google.com",
    icon: LineChart,
  },
  {
    title: "Search Console",
    subtitle: "Indexing & SEO Status",
    url: "https://search.google.com/search-console",
    icon: Search,
  },
  {
    title: "Hostinger Panel",
    subtitle: "Hosting & Server",
    url: "https://hpanel.hostinger.com",
    icon: Server,
  },
  {
    title: "Gmail Inbox",
    subtitle: "Leads & Email Client",
    url: "https://mail.google.com",
    icon: Mail,
  },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const { data, isLoading, mutate } = useSWR("/api/dashboard/stats");

  const publishedCount = data?.publishedPagesCount ?? 0;
  const blogsCount = data?.totalBlogsCount ?? 0;
  const commentsCount = data?.totalCommentsCount ?? 0;
  const unapprovedComments = data?.unapprovedCommentsCount ?? 0;
  const notificationsCount = data?.totalSubmissionsCount ?? 0;
  const unreadNotifications = data?.unreadSubmissionsCount ?? 0;
  const pages = (data?.recentPages as Page[]) || [];

  return (
    <>
      <header className="sticky top-0 z-30 bg-background flex h-16 shrink-0 items-center justify-between px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <a
          href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-foreground bg-card hover:bg-accent border border-border rounded-sm transition-all shadow-xs cursor-pointer"
        >
          <span>View Site</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </a>
      </header>

      <div className="flex flex-1 flex-col gap-8 p-6">
        {/* Quick Links Block */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Quick Launch & External Tools
            </h2>
          </div>
          <div className="grid auto-rows-min gap-4 md:grid-cols-4">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.title}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm bg-card border border-border p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-3">
                    <div className="p-2 rounded-sm bg-muted/60 group-hover:bg-primary/10 transition-colors">
                      <Icon className="size-4 text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors opacity-70 group-hover:opacity-100" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                      {item.subtitle}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Platform Metrics
          </h2>
          <div className={`grid auto-rows-min gap-4 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            {/* Total Notifications Card */}
            {isLoading && !data ? (
              <Skeleton className="h-26 w-full rounded-sm" />
            ) : (
            <Link
              href="/notifications"
              className="rounded-sm bg-card border border-border p-4 shadow-xs transition-all hover:border-primary hover:shadow-md cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                  Total Notifications
                </p>
                <div className="relative">
                  <Bell className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </div>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div className="text-3xl font-extrabold text-foreground">
                  {notificationsCount}
                </div>
                {unreadNotifications > 0 && (
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-xs border border-blue-200 dark:border-blue-800">
                    {unreadNotifications} unread
                  </span>
                )}
              </div>
            </Link>
            )}

            {/* Published Pages Card */}
            {isLoading && !data ? (
              <Skeleton className="h-26 w-full rounded-sm" />
            ) : (
            <Link
              href="/webpages"
              className="rounded-sm bg-card border border-border p-4 shadow-xs transition-all hover:border-primary hover:shadow-md cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                  Published Pages
                </p>
                <CheckCircleIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-3xl font-extrabold text-foreground pt-1">
                {publishedCount}
              </div>
            </Link>
            )}

            {/* Total Comments Card - Admin Only */}
            {isAdmin && (
              isLoading && !data ? (
                <Skeleton className="h-26 w-full rounded-sm" />
              ) : (
                <Link
                  href="/comments"
                  className="rounded-sm bg-card border border-border p-4 shadow-xs transition-all hover:border-primary hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-2">
                    <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      Total Comments
                    </p>
                    <MessageSquare className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <div className="text-3xl font-extrabold text-foreground">
                      {commentsCount}
                    </div>
                    {unapprovedComments > 0 && (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-xs border border-amber-200 dark:border-amber-800">
                        {unapprovedComments} pending
                      </span>
                    )}
                  </div>
                </Link>
              )
            )}

            {/* Total Blogs Card */}
            {isLoading && !data ? (
              <Skeleton className="h-26 w-full rounded-sm" />
            ) : (
            <Link
              href="/blogs"
              className="rounded-sm bg-card border border-border p-4 shadow-xs transition-all hover:border-primary hover:shadow-md cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                  Total Blogs
                </p>
                <PenToolIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-3xl font-extrabold text-foreground pt-1">
                {blogsCount}
              </div>
            </Link>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="flex flex-1 flex-col rounded-sm bg-card border border-border shadow-xs p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold">Recent Webpages</h3>
            <Link
              href="/webpages"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="rounded-sm">
            {isLoading && !data ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <DataTable
                columns={getWebpagesColumns(() => mutate())}
                data={pages.slice(0, 10)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
