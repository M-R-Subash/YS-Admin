"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Users,
  UserCheck,
  UserX,
  Mail,
  Download,
  Plus,
  RefreshCw,
  Upload,
  RotateCcw,
  FilterX,
  Send,
} from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/global-modal";
import { AddSubscribersModal } from "./AddSubscribersModal";
import {
  ContentMetricCards,
  MetricCardItem,
} from "@/components/admin/ContentMetricCards";
import {
  ContentFilterBar,
  ContentFilterTab,
} from "@/components/admin/ContentFilterBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "@/components/ui/data-table";
import { getSubscribersColumns, Subscriber } from "./subscribers-columns";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Metrics {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribedSubscribers: number;
  returnedSubscribers: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  avgDeliveryRate: number;
  senderEmail?: string;
  replyTo?: string;
}

export default function SubscribersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"csv" | "manual">("manual");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: metricsData,
    mutate: mutateMetrics,
    isValidating: isMetricsValidating,
  } = useSWR<{
    metrics: Metrics;
  }>("/api/newsletters/metrics", fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: subscribersData,
    isLoading: isSubscribersLoading,
    isValidating: isSubscribersValidating,
    mutate: mutateSubscribers,
  } = useSWR<{ subscribers: Subscriber[] }>(
    `/api/newsletters/subscribers?search=${encodeURIComponent(debouncedSearch)}&status=${statusFilter}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 8000,
    },
  );

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([mutateSubscribers(), mutateMetrics()]);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 500);
    }
  }, [mutateSubscribers, mutateMetrics]);

  const isSpinning =
    isManualRefreshing || isSubscribersValidating || isMetricsValidating;

  const metrics = useMemo(
    () =>
      metricsData?.metrics || {
        totalSubscribers: 0,
        activeSubscribers: 0,
        unsubscribedSubscribers: 0,
        returnedSubscribers: 0,
        totalCampaigns: 0,
        totalEmailsSent: 0,
        avgDeliveryRate: 100,
      },
    [metricsData],
  );

  const subscribers = useMemo(
    () => subscribersData?.subscribers || [],
    [subscribersData],
  );

  const handleCopyEmail = useCallback((email: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => {
        setCopiedEmail((curr) => (curr === email ? null : curr));
      }, 2000);
    }
  }, []);

  const handleAddSuccess = useCallback(() => {
    mutateSubscribers();
    mutateMetrics();
  }, [mutateSubscribers, mutateMetrics]);

  // Toggle Subscriber Status
  const handleToggleStatus = useCallback(
    async (sub: Subscriber) => {
      const nextStatus = sub.status === "active" ? "unsubscribed" : "active";
      try {
        const res = await fetch(`/api/newsletters/subscribers/${sub.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (res.ok) {
          toast.add({
            title: `Marked as ${nextStatus === "active" ? "Active" : "Unsubscribed"}`,
            type: "success",
          });
          mutateSubscribers();
          mutateMetrics();
        }
      } catch {
        toast.add({
          title: "Failed to update subscriber status",
          type: "error",
        });
      }
    },
    [mutateSubscribers, mutateMetrics],
  );

  // Delete Subscriber
  async function handleDeleteSubscriber() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/newsletters/subscribers/${deleteTargetId}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        toast.add({ title: "Subscriber removed permanently", type: "success" });
        mutateSubscribers();
        mutateMetrics();
      }
    } catch {
      toast.add({ title: "Failed to delete subscriber", type: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }

  // Export CSV
  function handleExportCsv() {
    window.open("/api/newsletters/subscribers/export", "_blank");
  }

  const metricCards = useMemo<MetricCardItem[]>(
    () => [
      {
        id: "all",
        label: "All Readers",
        count: metrics.totalSubscribers.toLocaleString(),
        icon: Users,
        color: "primary",
        isActive: statusFilter === "all",
        onClick: () => setStatusFilter("all"),
        badgeLabel: "Audience",
      },
      {
        id: "active",
        label: "Active Readers",
        count: metrics.activeSubscribers.toLocaleString(),
        icon: UserCheck,
        color: "emerald",
        isActive: statusFilter === "active",
        onClick: () => setStatusFilter("active"),
        badgeLabel: "Subscribed",
      },
      {
        id: "returned",
        label: "Returned Readers",
        count: (metrics.returnedSubscribers || 0).toLocaleString(),
        icon: RotateCcw,
        color: "purple",
        isActive: statusFilter === "returned",
        onClick: () => setStatusFilter("returned"),
        badgeLabel:
          metrics.activeSubscribers > 0
            ? `${Math.round(((metrics.returnedSubscribers || 0) / metrics.activeSubscribers) * 100)}% re-opted`
            : undefined,
      },
      {
        id: "unsubscribed",
        label: "Opted Out",
        count: metrics.unsubscribedSubscribers.toLocaleString(),
        icon: UserX,
        color: "red",
        isActive: statusFilter === "unsubscribed",
        onClick: () => setStatusFilter("unsubscribed"),
        badgeLabel:
          metrics.totalSubscribers > 0
            ? `${Math.round((metrics.unsubscribedSubscribers / metrics.totalSubscribers) * 100)}%`
            : undefined,
      },
      {
        id: "campaigns",
        label: "Campaigns Dispatched",
        count: metrics.totalCampaigns.toLocaleString(),
        icon: Mail,
        color: "amber",
        isActive: false,
        badgeLabel: `${metrics.avgDeliveryRate}% delivery rate`,
      },
    ],
    [metrics, statusFilter],
  );

  const filterTabs = useMemo<ContentFilterTab[]>(
    () => [
      {
        id: "all",
        label: "All Readers",
        count: metrics.totalSubscribers,
        color: "primary",
      },
      {
        id: "active",
        label: "Active",
        count: metrics.activeSubscribers,
        color: "emerald",
      },
      {
        id: "returned",
        label: "Returned",
        count: metrics.returnedSubscribers || 0,
        color: "purple",
      },
      {
        id: "unsubscribed",
        label: "Opted Out",
        count: metrics.unsubscribedSubscribers,
        color: "red",
      },
    ],
    [metrics],
  );

  const columns = useMemo(
    () =>
      getSubscribersColumns({
        onToggleStatus: handleToggleStatus,
        onDelete: (id: string) => setDeleteTargetId(id),
        copiedEmail,
        onCopyEmail: handleCopyEmail,
      }),
    [copiedEmail, handleToggleStatus, handleCopyEmail],
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AdminTopBar
          breadcrumbs={[
            { label: "Newsletter", href: "/newsletters" },
            { label: "Subscribers", href: "/newsletters" },
          ]}
        />

        <main className="flex-1 w-full px-3.75 md:px-5 lg:px-7.5 py-4 space-y-5">
          {/* Clean Action Bar with Actions on Left and Send Button on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="text-xs h-8.5 gap-1.5 cursor-pointer rounded-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddModalTab("csv");
                  setIsAddModalOpen(true);
                }}
                className="text-xs h-8.5 gap-1.5 cursor-pointer hover:border-amber-500/50 rounded-sm"
              >
                <Upload className="w-3.5 h-3.5 text-amber-500" />
                Import CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddModalTab("manual");
                  setIsAddModalOpen(true);
                }}
                className="text-xs h-8.5 gap-1.5 cursor-pointer rounded-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Reader
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/newsletters/compose">
                <Button
                  size="sm"
                  className="text-xs h-8.5 gap-1.5 bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs rounded-sm hover:opacity-90"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Newsletter
                </Button>
              </Link>
            </div>
          </div>

          {/* 5 Content Metric Filter Cards */}
          <ContentMetricCards cards={metricCards} loading={!metricsData} />

          {/* Unified CMS ContentFilterBar */}
          <ContentFilterBar
            tabs={filterTabs}
            activeTab={statusFilter}
            onTabChange={(id) => setStatusFilter(id)}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search subscribers by email address..."
            extraRightContent={
              <div className="flex items-center gap-1.5 shrink-0">
                {statusFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <FilterX className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear filter</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isSpinning}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm"
                  title="Refresh subscriber list"
                >
                  <RefreshCw
                    className={cn(
                      "w-3.5 h-3.5",
                      isSpinning && "animate-spin text-amber-500",
                    )}
                  />
                </Button>
              </div>
            }
          />

          {/* DataTable Component matching Blogs & Pages */}
          {isSubscribersLoading ? (
            <div className="rounded-sm border bg-card p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-sm p-6">
              <div className="w-12 h-12 rounded-2xl bg-border/40 text-muted flex items-center justify-center mx-auto mb-3">
                <Users
                  className="w-6 h-6 text-muted-foreground"
                  strokeWidth={2}
                />
              </div>
              <div className="text-foreground font-semibold text-base mb-1">
                {search
                  ? `No subscribers matching "${search}"`
                  : statusFilter !== "all"
                    ? `No ${statusFilter} subscribers found`
                    : "No subscribers yet"}
              </div>
              <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                {search || statusFilter !== "all"
                  ? "Try resetting your search query or status filter."
                  : "Readers who subscribe on your website will appear here automatically."}
              </p>
              <div className="pt-3 flex items-center justify-center gap-2">
                {search || statusFilter !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                    className="text-xs h-8 gap-1.5 cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setAddModalTab("manual");
                      setIsAddModalOpen(true);
                    }}
                    className="text-xs h-8 gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Reader
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <DataTable columns={columns} data={subscribers} />
          )}
        </main>

        {/* MODAL: Add & Import Subscribers (State isolated to prevent typing from re-rendering the table) */}
        <AddSubscribersModal
          isOpen={isAddModalOpen}
          initialTab={addModalTab}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />

        {/* CONFIRMATION: Delete Subscriber using ConfirmModal */}
        <ConfirmModal
          open={Boolean(deleteTargetId)}
          onOpenChange={(open) => !open && setDeleteTargetId(null)}
          variant="danger"
          title="Delete Subscriber?"
          description="This subscriber will be permanently deleted from the database. This action cannot be undone."
          confirmText="Delete Permanently"
          onConfirm={handleDeleteSubscriber}
          loading={isDeleting}
        />
      </div>
    </TooltipProvider>
  );
}
