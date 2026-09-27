"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Plus,
  Layers,
} from "lucide-react";
import { AdminTopBar } from "@/components/AdminTopBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SchedulePostModal } from "@/components/blog/dialogs/SchedulePostModal";
import { DataTable } from "@/components/ui/data-table";
import { ContentMetricCards, MetricCardItem } from "@/components/admin/ContentMetricCards";
import { ContentFilterBar, ContentFilterTab } from "@/components/admin/ContentFilterBar";
import {
  getScheduledColumns,
  ScheduledItem,
} from "./scheduled-columns";
import { format } from "date-fns";

interface ScheduledApiResponse {
  items: ScheduledItem[];
  counts: {
    all: number;
    upcoming: number;
    pending: number;
    failed: number;
    success: number;
  };
  serverTime: string;
}

type TabType = "all" | "upcoming" | "pending" | "failed" | "success";

export default function ScheduledActionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Reschedule Modal state
  const [selectedPost, setSelectedPost] = useState<ScheduledItem | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Action Loading state per item ID
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR<ScheduledApiResponse>(
    "/api/scheduled-actions",
    {
      refreshInterval: 180000, // 3 minutes - smart background polling
      revalidateOnFocus: true,
      revalidateOnMount: true,
      revalidateIfStale: true,
      dedupingInterval: 2000,
    }
  );

  const items = data?.items || [];
  const counts = data?.counts || { all: 0, upcoming: 0, pending: 0, failed: 0, success: 0 };
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";

  // Filter items based on activeTab and searchQuery
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.author?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === "all") return true;
      return item.scheduleState === activeTab;
    });
  }, [items, searchQuery, activeTab]);

  // Trigger manual publish sync
  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/scheduled-actions", {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to trigger publisher");
      }

      if (result.publishedCount > 0) {
        toast.add({
          title: "Scheduler Executed",
          description: result.message,
          type: "success",
        });
      } else {
        toast.add({
          title: "Scheduler Synced",
          description: "Checked for scheduled posts: none were overdue.",
          type: "info",
        });
      }
      await mutate();
    } catch (err: any) {
      toast.add({
        title: "Sync Error",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Immediate publish of a single post
  const handlePublishNow = async (item: ScheduledItem) => {
    try {
      setActionLoadingId(item.id);
      const res = await fetch(`/api/blogs/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish-now",
          status: "published",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to publish post");
      }

      toast.add({
        title: "Post Published Immediately",
        description: `"${item.title}" is now live!`,
        type: "success",
      });
      await mutate();
    } catch (err: any) {
      toast.add({
        title: "Publish Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel schedule and revert to draft
  const handleCancelSchedule = async (item: ScheduledItem) => {
    try {
      setActionLoadingId(item.id);
      const res = await fetch(`/api/blogs/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel-schedule",
          status: "draft",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to cancel schedule");
      }

      toast.add({
        title: "Schedule Cancelled",
        description: `"${item.title}" has been reverted to draft.`,
        type: "info",
      });
      await mutate();
    } catch (err: any) {
      toast.add({
        title: "Error",
        description: err.message,
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open reschedule dialog for post
  const openRescheduleModal = (item: ScheduledItem) => {
    setSelectedPost(item);
    setRescheduleModalOpen(true);
  };

  // Confirm reschedule from dialog
  const handleConfirmReschedule = async (newDate: Date) => {
    if (!selectedPost) return;

    try {
      setIsRescheduling(true);
      const res = await fetch(`/api/blogs/${selectedPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          scheduledAt: newDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reschedule post");
      }

      toast.add({
        title: "Schedule Updated",
        description: `Rescheduled for ${format(newDate, "MMM d, yyyy 'at' h:mm a")}`,
        type: "success",
      });
      setRescheduleModalOpen(false);
      setSelectedPost(null);
      await mutate();
    } catch (err: any) {
      toast.add({
        title: "Reschedule Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  // Table Columns
  const columns = useMemo(() => {
    return getScheduledColumns({
      onPublishNow: handlePublishNow,
      onOpenReschedule: openRescheduleModal,
      onCancelSchedule: handleCancelSchedule,
      actionLoadingId,
      siteUrl,
      onNavigateEdit: (url) => router.push(url),
    });
  }, [actionLoadingId, siteUrl, router]);

  // Metric Cards
  const metricCards = useMemo<MetricCardItem[]>(() => [
    {
      id: "all",
      label: "All Actions",
      count: counts.all,
      icon: Layers,
      color: "primary",
      isActive: activeTab === "all",
      onClick: () => setActiveTab("all"),
    },
    {
      id: "upcoming",
      label: "Upcoming Queue",
      count: counts.upcoming,
      icon: Clock,
      color: "purple",
      isActive: activeTab === "upcoming",
      onClick: () => setActiveTab("upcoming"),
    },
    {
      id: "pending",
      label: counts.failed > 0 ? "Failed / Overdue" : "Pending Queue",
      count: counts.failed > 0 ? `${counts.failed} Failed` : counts.pending,
      icon: AlertCircle,
      color: counts.failed > 0 ? "red" : "amber",
      isActive: activeTab === "pending" || activeTab === "failed",
      onClick: () => setActiveTab(counts.failed > 0 ? "failed" : "pending"),
    },
    {
      id: "success",
      label: "Success Releases",
      count: counts.success,
      icon: CheckCircle2,
      color: "emerald",
      isActive: activeTab === "success",
      onClick: () => setActiveTab("success"),
    },
  ], [counts, activeTab]);

  // Filter Tabs
  const filterTabs = useMemo<ContentFilterTab[]>(() => {
    const tabs: ContentFilterTab[] = [
      { id: "all", label: "All", count: counts.all, color: "primary" },
      { id: "upcoming", label: "Upcoming", count: counts.upcoming, color: "purple" },
      { id: "pending", label: "Pending", count: counts.pending, color: "amber" },
    ];
    if (counts.failed > 0) {
      tabs.push({ id: "failed", label: "Failed", count: counts.failed, color: "red" });
    }
    tabs.push({ id: "success", label: "Success", count: counts.success, color: "emerald" });
    return tabs;
  }, [counts]);

  return (
    <TooltipProvider delay={200}>
      <AdminTopBar breadcrumbs="Scheduled Actions" />

      <div className="flex flex-1 flex-col gap-6 py-6 px-[15px] md:px-[20px] lg:px-[30px]">
        {/* 4 Metric Cards */}
        <ContentMetricCards cards={metricCards} loading={isLoading && !data} />

        {/* Search & Tabs Filter Row with Actions */}
        <ContentFilterBar
          tabs={filterTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as any)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search scheduled posts..."
          extraRightContent={
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="h-9 gap-2 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
              >
                <RotateCw className={`w-3.5 h-3.5 text-purple-600 ${isSyncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isSyncing ? "Checking..." : "Run Scheduler"}</span>
              </Button>

              <Link href="/blogs/create">
                <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Post</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Data Table */}
        {isLoading && !data ? (
          <div className="rounded-md border bg-card p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-sm p-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <CalendarClock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm">
              No scheduled actions found
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {searchQuery
                ? "No posts match your search query."
                : activeTab !== "all"
                ? `No posts in the "${activeTab}" filter.`
                : "You don't have any scheduled blog posts yet."}
            </p>
            <Link href="/blogs/create">
              <Button size="sm" className="h-8 gap-2 text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule a Blog Post</span>
              </Button>
            </Link>
          </div>
        ) : (
          <DataTable columns={columns} data={filteredItems} />
        )}
      </div>

      {/* Reschedule Modal */}
      {selectedPost && (
        <SchedulePostModal
          open={rescheduleModalOpen}
          onOpenChange={(open) => {
            setRescheduleModalOpen(open);
            if (!open) setSelectedPost(null);
          }}
          currentScheduledAt={selectedPost.scheduledAt}
          onConfirmSchedule={handleConfirmReschedule}
          onCancelSchedule={async () => {
            if (selectedPost) await handleCancelSchedule(selectedPost);
            setRescheduleModalOpen(false);
          }}
          isSubmitting={isRescheduling}
        />
      )}
    </TooltipProvider>
  );
}
