"use client";

import { useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  PenToolIcon,
  ExternalLink,
  Bell,
  MessageSquare,
  LineChart,
  Search,
  Server,
  Mail,
  Globe,
} from "lucide-react";

import { Page } from "@/types";
import { AdminTopBar } from "@/components/AdminTopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentMetricCards, MetricCardItem } from "@/components/admin/ContentMetricCards";

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
  const router = useRouter();
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

  const metricCards = useMemo<MetricCardItem[]>(() => {
    const list: MetricCardItem[] = [
      {
        id: "notifications",
        label: "Notifications",
        count: notificationsCount,
        icon: Bell,
        color: "primary",
        badgeLabel: unreadNotifications > 0 ? `${unreadNotifications} unread` : undefined,
        isActive: unreadNotifications > 0,
        onClick: () => router.push("/notifications"),
      },
      {
        id: "pages",
        label: "Published Pages",
        count: publishedCount,
        icon: Globe,
        color: "emerald",
        onClick: () => router.push("/webpages"),
      },
    ];

    if (isAdmin) {
      list.push({
        id: "comments",
        label: "Total Comments",
        count: commentsCount,
        icon: MessageSquare,
        color: "amber",
        badgeLabel: unapprovedComments > 0 ? `${unapprovedComments} pending` : undefined,
        isActive: unapprovedComments > 0,
        onClick: () => router.push("/comments"),
      });
    }

    list.push({
      id: "blogs",
      label: "Total Blogs",
      count: blogsCount,
      icon: PenToolIcon,
      color: "purple",
      onClick: () => router.push("/blogs"),
    });

    return list;
  }, [notificationsCount, unreadNotifications, publishedCount, commentsCount, unapprovedComments, blogsCount, isAdmin, router]);

  return (
    <>
      <AdminTopBar breadcrumbs="Dashboard" />

      <div className="flex flex-1 flex-col gap-8 py-6 px-3.75 md:px-5 lg:px-7.5">
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
          <ContentMetricCards cards={metricCards} loading={isLoading && !data} />
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
