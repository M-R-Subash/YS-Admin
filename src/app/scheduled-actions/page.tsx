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
  Play,
  RotateCw,
  Search,
  Plus,
  ExternalLink,
  MoreHorizontal,
  PenTool,
  Calendar,
  Layers,
  ArrowRight,
  Globe,
  Undo2,
} from "lucide-react";
import { AdminTopBar } from "@/components/AdminTopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { SchedulePostModal } from "@/components/blog/dialogs/SchedulePostModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";

interface ScheduledItem {
  id: string;
  title: string;
  slug: string;
  featuredImage: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  categories: string[];
  tags: string[];
  scheduleState: "upcoming" | "pending" | "failed" | "success";
  hasStagedUpdate?: boolean;
  author?: {
    id: string;
    name: string | null;
    email: string;
    profilePicture: string | null;
  } | null;
}

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
      refreshInterval: 30000, // auto-refresh every 30s
      revalidateOnFocus: true,
    }
  );

  const items = data?.items || [];
  const counts = data?.counts || { all: 0, upcoming: 0, pending: 0, failed: 0, success: 0 };
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";

  // User timezone
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    } catch {
      return "Local";
    }
  }, []);

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

  return (
    <TooltipProvider delay={200}>
      <AdminTopBar breadcrumbs="Scheduled Actions" />

      <div className="flex flex-1 flex-col gap-6 py-6 px-[15px] md:px-[20px] lg:px-[30px]">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <CalendarClock className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                Scheduled Actions
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Automated publishing queue, upcoming releases, and manual trigger controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="h-8 gap-2 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              <RotateCw className={`w-3.5 h-3.5 text-purple-600 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Checking Queue..." : "Run Scheduler Now"}</span>
            </Button>

            <Link href="/blogs/create">
              <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule New Blog</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading && !data ? (
            <>
              <Skeleton className="h-24 w-full rounded-sm" />
              <Skeleton className="h-24 w-full rounded-sm" />
              <Skeleton className="h-24 w-full rounded-sm" />
              <Skeleton className="h-24 w-full rounded-sm" />
            </>
          ) : (
            <>
              {/* Total Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab("all")}
                className={`rounded-sm border p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none ${
                  activeTab === "all"
                    ? "bg-primary/5 border-primary ring-1 ring-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    All Actions
                  </p>
                  <div className="p-1.5 rounded-sm bg-primary/10 text-primary">
                    <Layers className="size-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-extrabold text-foreground">
                    {counts.all}
                  </div>
                  {activeTab === "all" && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Upcoming Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab("upcoming")}
                className={`rounded-sm border p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none ${
                  activeTab === "upcoming"
                    ? "bg-purple-500/5 border-purple-500 ring-1 ring-purple-500 shadow-sm"
                    : "bg-card border-border hover:border-purple-500/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Upcoming Queue
                  </p>
                  <div className="p-1.5 rounded-sm bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-extrabold text-foreground">
                    {counts.upcoming}
                  </div>
                  {activeTab === "upcoming" && (
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-xs border border-purple-500/20">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Pending & Failed / Overdue Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab(counts.failed > 0 ? "failed" : "pending")}
                className={`rounded-sm border p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none ${
                  activeTab === "pending" || activeTab === "failed"
                    ? counts.failed > 0
                      ? "bg-red-500/5 border-red-500 ring-1 ring-red-500 shadow-sm"
                      : "bg-amber-500/5 border-amber-500 ring-1 ring-amber-500 shadow-sm"
                    : counts.failed > 0
                    ? "bg-card border-border hover:border-red-500/40 hover:shadow-xs"
                    : "bg-card border-border hover:border-amber-500/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {counts.failed > 0 ? "Failed / Overdue" : "Pending Queue"}
                  </p>
                  <div
                    className={`p-1.5 rounded-sm ${
                      counts.failed > 0
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    <AlertCircle className="size-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-extrabold text-foreground">
                    {counts.failed > 0 ? `${counts.failed} Failed` : counts.pending}
                  </div>
                  {(activeTab === "pending" || activeTab === "failed") && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-xs border ${
                        counts.failed > 0
                          ? "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20"
                          : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                      }`}
                    >
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Success / Completed Releases Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab("success")}
                className={`rounded-sm border p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none ${
                  activeTab === "success"
                    ? "bg-emerald-500/5 border-emerald-500 ring-1 ring-emerald-500 shadow-sm"
                    : "bg-card border-border hover:border-emerald-500/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Success Releases
                  </p>
                  <div className="p-1.5 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-extrabold text-foreground">
                    {counts.success}
                  </div>
                  {activeTab === "success" && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-xs border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search & Tabs Filter Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "upcoming"
                  ? "bg-purple-600 text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Upcoming ({counts.upcoming})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "pending"
                  ? "bg-amber-600 text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Pending ({counts.pending})
            </button>
            {counts.failed > 0 && (
              <button
                onClick={() => setActiveTab("failed")}
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors ${
                  activeTab === "failed"
                    ? "bg-red-600 text-white"
                    : "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25"
                }`}
              >
                Failed ({counts.failed})
              </button>
            )}
            <button
              onClick={() => setActiveTab("success")}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Success ({counts.success})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search scheduled posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Data Table Container */}
        <div className="rounded-sm border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Post & Title</th>
                  <th className="py-3 px-4">Target Schedule</th>
                  <th className="py-3 px-4">Timing & Status</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && !data ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-sm" />
                          <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-4 px-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-4 px-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-muted-foreground">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
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
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const scheduledDate = item.scheduledAt ? new Date(item.scheduledAt) : null;
                    const isOverdue = scheduledDate ? isPast(scheduledDate) : false;
                    const cleanSlug = item.slug?.startsWith("/") ? item.slug.slice(1) : item.slug;
                    const publicUrl = siteUrl ? `${siteUrl}/blogs/${cleanSlug}` : undefined;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Post & Title Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {item.featuredImage ? (
                              <img
                                src={item.featuredImage}
                                alt={item.title}
                                className="w-10 h-10 rounded-sm object-cover shrink-0 bg-muted border border-border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center shrink-0 border border-border text-[10px] text-muted-foreground uppercase font-bold">
                                Img
                              </div>
                            )}
                            <div className="min-w-0 max-w-xs md:max-w-sm">
                              <Link
                                href={`/blogs/edit/${item.id}`}
                                className="font-bold text-foreground hover:text-primary transition-colors truncate block text-xs"
                              >
                                {item.title}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-muted-foreground truncate font-mono">
                                  /blogs/{cleanSlug}
                                </span>
                                {item.categories?.length > 0 && (
                                  <span className="px-1.5 py-0.2 bg-secondary text-secondary-foreground text-[9px] font-semibold uppercase rounded-xs">
                                    {item.categories[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Target Schedule Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {scheduledDate ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>
                                  {isToday(scheduledDate)
                                    ? "Today"
                                    : isTomorrow(scheduledDate)
                                    ? "Tomorrow"
                                    : format(scheduledDate, "MMM d, yyyy")}
                                </span>
                                {item.hasStagedUpdate && (
                                  <span className="px-1.5 py-0.2 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-bold uppercase rounded-xs border border-purple-500/20">
                                    Staged Update
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{format(scheduledDate, "h:mm a")}</span>
                              </div>
                            </div>
                          ) : item.publishedAt ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="font-medium text-foreground flex items-center gap-1.5 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{format(new Date(item.publishedAt), "MMM d, yyyy")}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(item.publishedAt), "h:mm a")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Not specified</span>
                          )}
                        </td>

                        {/* Timing & Status Column - Direct Badges, No Tooltips */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {item.scheduleState === "success" && (
                              <>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>Success</span>
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {item.publishedAt
                                    ? `Published ${format(new Date(item.publishedAt), "MMM d, yyyy 'at' h:mm a")}`
                                    : `Live since ${format(new Date(item.updatedAt), "MMM d, yyyy")}`}
                                </span>
                              </>
                            )}

                            {item.scheduleState === "failed" && (
                              <>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
                                  <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                                  <span>Failed</span>
                                </span>
                                <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                                  {scheduledDate ? `Overdue by ${formatDistanceToNow(scheduledDate)}` : "Trigger missed"}
                                </span>
                              </>
                            )}

                            {item.scheduleState === "pending" && (
                              <>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 animate-spin" />
                                  <span>Pending</span>
                                </span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  {scheduledDate ? `Due ${formatDistanceToNow(scheduledDate, { addSuffix: true })}` : "Due now"}
                                </span>
                              </>
                            )}

                            {item.scheduleState === "upcoming" && (
                              <>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                  <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                                  <span>Upcoming</span>
                                </span>
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                  {scheduledDate ? `In ${formatDistanceToNow(scheduledDate)}` : "Upcoming"}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Author Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {item.author?.profilePicture ? (
                              <img
                                src={item.author.profilePicture}
                                alt={item.author.name || "Author"}
                                className="w-6 h-6 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted text-[10px] font-bold flex items-center justify-center text-muted-foreground">
                                {(item.author?.name || "A")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="text-xs">
                              <p className="font-medium text-foreground">
                                {item.author?.name || "Admin"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.scheduleState === "upcoming" || item.scheduleState === "pending" || item.scheduleState === "failed" ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handlePublishNow(item)}
                                  className={`h-7 px-2.5 text-[11px] font-semibold gap-1 cursor-pointer ${
                                    item.scheduleState === "failed"
                                      ? "border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                      : "border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                                  }`}
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Publish Now</span>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRescheduleModal(item)}
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  Reschedule
                                </Button>
                              </>
                            ) : (
                              publicUrl && item.status === "published" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(publicUrl, "_blank")}
                                  className="h-7 px-2.5 text-[11px] font-semibold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                                >
                                  <Globe className="w-3 h-3" />
                                  <span>View Live</span>
                                </Button>
                              )
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>Post Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/blogs/edit/${item.id}`)}>
                                    <PenTool className="w-3.5 h-3.5 mr-2" />
                                    Edit in Builder
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => window.open(`/blogs/preview/${item.id}`, `preview_${item.id}`)}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                    Live Preview
                                  </DropdownMenuItem>
                                  {publicUrl && item.status === "published" && (
                                    <DropdownMenuItem onClick={() => window.open(publicUrl, "_blank")}>
                                      <Globe className="w-3.5 h-3.5 mr-2" />
                                      View Live Post
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>

                                {(item.scheduleState === "upcoming" || item.scheduleState === "pending" || item.scheduleState === "failed") && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                      <DropdownMenuItem
                                        onClick={() => handleCancelSchedule(item)}
                                        className="text-amber-600 focus:text-amber-600"
                                      >
                                        <Undo2 className="w-3.5 h-3.5 mr-2" />
                                        Revert to Draft
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
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
