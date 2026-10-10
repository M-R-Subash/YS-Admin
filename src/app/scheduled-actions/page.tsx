"use client";

import React, { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Plus,
  Layers,
  Mail,
  FileText,
  ChevronDown,
} from "lucide-react";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { clientConfig } from "@/lib/config/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SchedulePostModal } from "@/components/blog/dialogs/SchedulePostModal";
import { DataTable } from "@/components/ui/data-table";
import { ContentMetricCards, MetricCardItem } from "@/components/admin/ContentMetricCards";
import { ContentFilterBar, ContentFilterTab } from "@/components/admin/ContentFilterBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    blogs?: number;
    newsletters?: number;
  };
  serverTime: string;
}

type TabType = "all" | "upcoming" | "pending" | "failed" | "success";
type TypeFilterType = "all" | "blog" | "newsletter";

export default function ScheduledActionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>("all");
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
      refreshInterval: 180000, // 3 minutes - background polling
      revalidateOnFocus: true,
      revalidateOnMount: true,
      revalidateIfStale: true,
      dedupingInterval: 2000,
    }
  );

  const items = useMemo(() => data?.items || [], [data?.items]);
  const counts = useMemo(
    () => data?.counts || { all: 0, upcoming: 0, pending: 0, failed: 0, success: 0, blogs: 0, newsletters: 0 },
    [data?.counts]
  );
  const siteUrl = clientConfig.app.frontendUrl;

  // Filter items based on activeTab, typeFilter, and searchQuery
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (typeFilter !== "all" && item.itemType !== typeFilter) return false;

      // Status tab filter
      if (activeTab !== "all" && item.scheduleState !== activeTab) return false;

      // Search match
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const matchesTitle = item.title?.toLowerCase().includes(query);
      const matchesSlug = item.slug?.toLowerCase().includes(query);
      const matchesAuthor = (item.author?.name || "").toLowerCase().includes(query);
      const matchesCategory = item.categories?.some((c) => c.toLowerCase().includes(query));

      return Boolean(matchesTitle || matchesSlug || matchesAuthor || matchesCategory);
    });
  }, [items, searchQuery, activeTab, typeFilter]);

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
          description: "Checked for scheduled actions: none were overdue.",
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

  // Immediate publish/send of a single scheduled item
  const handlePublishNow = useCallback(async (item: ScheduledItem) => {
    try {
      setActionLoadingId(item.id);
      if (item.itemType === "newsletter") {
        const res = await fetch(`/api/newsletters/campaigns/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send-now" }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || "Failed to dispatch newsletter");
        }

        toast.add({
          title: "Newsletter Dispatched Immediately",
          description: `"${item.title}" is now sending to active subscribers!`,
          type: "success",
        });
      } else {
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
      }
      await mutate();
    } catch (err: any) {
      toast.add({
        title: item.itemType === "newsletter" ? "Dispatch Failed" : "Publish Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  }, [mutate]);

  // Cancel schedule and revert to draft
  const handleCancelSchedule = useCallback(async (item: ScheduledItem) => {
    try {
      setActionLoadingId(item.id);
      if (item.itemType === "newsletter") {
        const res = await fetch(`/api/newsletters/campaigns/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || "Failed to cancel newsletter schedule");
        }

        toast.add({
          title: "Newsletter Schedule Cancelled",
          description: `"${item.title}" has been removed from the schedule.`,
          type: "info",
        });
      } else {
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
      }
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
  }, [mutate]);

  // Open reschedule dialog for item
  const openRescheduleModal = useCallback((item: ScheduledItem) => {
    setSelectedPost(item);
    setRescheduleModalOpen(true);
  }, []);

  // Confirm reschedule from dialog
  const handleConfirmReschedule = async (newDate: Date) => {
    if (!selectedPost) return;

    try {
      setIsRescheduling(true);
      if (selectedPost.itemType === "newsletter") {
        const res = await fetch(`/api/newsletters/campaigns/${selectedPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reschedule",
            scheduledAt: newDate.toISOString(),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || "Failed to reschedule newsletter");
        }

        toast.add({
          title: "Newsletter Blast Rescheduled",
          description: `Scheduled for ${format(newDate, "MMM d, yyyy 'at' h:mm a")}`,
          type: "success",
        });
      } else {
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
          title: "Post Schedule Updated",
          description: `Rescheduled for ${format(newDate, "MMM d, yyyy 'at' h:mm a")}`,
          type: "success",
        });
      }
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
    });
  }, [handlePublishNow, openRescheduleModal, handleCancelSchedule, actionLoadingId, siteUrl]);

  // Metric Cards
  const metricCards = useMemo<MetricCardItem[]>(() => [
    {
      id: "all",
      label: "All Actions",
      count: counts.all,
      icon: Layers,
      color: "primary",
      isActive: activeTab === "all" && typeFilter === "all",
      onClick: () => {
        setActiveTab("all");
        setTypeFilter("all");
      },
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
  ], [counts, activeTab, typeFilter]);

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

      <div className="flex flex-1 flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5">
        {/* Top Control Bar: Tab Switcher (Left) & Action Buttons (Right) with Space-Between */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Tab Switcher (All Types / Blogs / Newsletters) */}
          <div className="flex items-center p-0.5 rounded-sm bg-muted border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
                typeFilter === "all"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Types ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("blog")}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                typeFilter === "blog"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Blogs ({counts.blogs || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("newsletter")}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                typeFilter === "newsletter"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-violet-500" />
              <span>Newsletters ({counts.newsletters || 0})</span>
            </button>
          </div>

          {/* Right: The Two Buttons (Run Scheduler & Schedule Action) */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
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

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Action</span>
                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem className="cursor-pointer p-0">
                  <Link href="/blogs/create" className="flex items-center w-full px-2.5 py-2">
                    <FileText className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <span>Schedule Blog Post</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer p-0">
                  <Link href="/newsletters/compose" className="flex items-center w-full px-2.5 py-2">
                    <Mail className="w-3.5 h-3.5 mr-2 text-violet-500" />
                    <span>Schedule Newsletter</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <ContentMetricCards cards={metricCards} loading={isLoading && !data} />

        {/* Search & Tabs Filter Row */}
        <ContentFilterBar
          tabs={filterTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as any)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search scheduled actions..."
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
                ? "No actions match your search query."
                : activeTab !== "all" || typeFilter !== "all"
                ? `No items found under the selected filters.`
                : "You don't have any scheduled actions yet."}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Link href="/blogs/create">
                <Button size="sm" className="h-8 gap-2 text-xs cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule a Blog</span>
                </Button>
              </Link>
              <Link href="/newsletters/compose">
                <Button size="sm" variant="outline" className="h-8 gap-2 text-xs cursor-pointer">
                  <Mail className="w-3.5 h-3.5 text-violet-500" />
                  <span>Schedule Newsletter</span>
                </Button>
              </Link>
            </div>
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
          title={
            selectedPost.itemType === "newsletter"
              ? "Reschedule Newsletter Blast"
              : "Reschedule Blog Post"
          }
          description={
            selectedPost.itemType === "newsletter"
              ? "Choose a new date and time for this newsletter campaign to automatically blast to subscribers."
              : "Choose a new date and time for this blog post to automatically go live."
          }
          currentScheduledAt={selectedPost.scheduledAt}
          postTitle={selectedPost.title}
          onConfirmSchedule={handleConfirmReschedule}
          onCancelSchedule={async () => {
            if (selectedPost) await handleCancelSchedule(selectedPost);
            setRescheduleModalOpen(false);
          }}
          isSubmitting={isRescheduling}
          skipInternalConfirm={true}
          showNewsletterOption={false}
        />
      )}
    </TooltipProvider>
  );
}
