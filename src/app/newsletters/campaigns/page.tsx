"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Percent,
  FileText,
  Users,
  Sparkles,
  Clock,
  FilterX,
  Send,
} from "lucide-react";
import { format } from "date-fns";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { getCampaignsColumns, Campaign } from "./campaigns-columns";
import { BRAND_LOGO_URL, formatEmailBody } from "@/lib/newsletter/templates";
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

export default function CampaignHistoryPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [retryingCampaignId, setRetryingCampaignId] = useState<string | null>(
    null,
  );
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );

  const {
    data: campaignsData,
    isLoading: isCampaignsLoading,
    isValidating: isCampaignsValidating,
    mutate: mutateCampaigns,
  } = useSWR<{ campaigns: Campaign[] }>("/api/newsletters/campaigns", fetcher, {
    refreshInterval: (latestData) => {
      const isProcessing = latestData?.campaigns?.some(
        (c: Campaign) => c.status === "processing",
      );
      return isProcessing ? 4000 : 0;
    },
    revalidateOnFocus: false,
  });

  const hasProcessingCampaign = Boolean(
    campaignsData?.campaigns?.some((c) => c.status === "processing"),
  );

  const {
    data: metricsData,
    mutate: mutateMetrics,
    isValidating: isMetricsValidating,
  } = useSWR<{
    metrics: Metrics;
  }>("/api/newsletters/metrics", fetcher, {
    refreshInterval: hasProcessingCampaign ? 4000 : 0,
    revalidateOnFocus: false,
  });

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([mutateCampaigns(), mutateMetrics()]);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 500);
    }
  }, [mutateCampaigns, mutateMetrics]);

  const isSpinning =
    isManualRefreshing || isCampaignsValidating || isMetricsValidating;

  const campaigns = useMemo(
    () => campaignsData?.campaigns || [],
    [campaignsData],
  );
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

  // Diagnostic error parser for modal
  const parsedErrorInfo = useMemo(() => {
    if (!selectedCampaign?.errorMessage) return null;
    try {
      const parsed = JSON.parse(selectedCampaign.errorMessage);
      return {
        error:
          typeof parsed.error === "string"
            ? parsed.error
            : "Unknown delivery error",
        failedEmails: Array.isArray(parsed.failedEmails)
          ? (parsed.failedEmails as string[])
          : [],
      };
    } catch {
      return {
        error: selectedCampaign.errorMessage,
        failedEmails: [] as string[],
      };
    }
  }, [selectedCampaign]);

  // Retry Failed Recipients Handler
  const handleRetryCampaign = useCallback(
    async (campaignId: string) => {
      setRetryingCampaignId(campaignId);
      try {
        const res = await fetch(
          `/api/newsletters/campaigns/${campaignId}/retry`,
          {
            method: "POST",
          },
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          toast.add({
            title: data.message || "Retrying dispatch to failed recipients...",
            type: "success",
          });
          mutateCampaigns();
          mutateMetrics();
        } else {
          toast.add({
            title: data.error || "Failed to retry campaign",
            type: "error",
          });
        }
      } catch {
        toast.add({
          title: "Network error occurred while retrying",
          type: "error",
        });
      } finally {
        setRetryingCampaignId(null);
      }
    },
    [mutateCampaigns, mutateMetrics],
  );

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        !search.trim() ||
        c.subject.toLowerCase().includes(search.toLowerCase().trim()) ||
        c.blog?.title.toLowerCase().includes(search.toLowerCase().trim());

      if (!matchesSearch) return false;

      if (filterType === "all") return true;
      if (filterType === "blog") return c.type === "BLOG_UPDATE";
      if (filterType === "blast") return c.type === "CUSTOM_BLAST";
      if (filterType === "failed")
        return c.failedCount > 0 || c.status === "failed";
      if (filterType === "completed") return c.status === "completed";
      return true;
    });
  }, [campaigns, search, filterType]);

  const blogUpdatesCount = useMemo(
    () => campaigns.filter((c) => c.type === "BLOG_UPDATE").length,
    [campaigns],
  );
  const customBlastsCount = useMemo(
    () => campaigns.filter((c) => c.type === "CUSTOM_BLAST").length,
    [campaigns],
  );
  const failedCount = useMemo(
    () =>
      campaigns.filter((c) => c.failedCount > 0 || c.status === "failed")
        .length,
    [campaigns],
  );

  const metricCards = useMemo<MetricCardItem[]>(
    () => [
      {
        id: "all",
        label: "Campaigns Dispatched",
        count: metrics.totalCampaigns.toLocaleString(),
        icon: Mail,
        color: "primary",
        isActive: filterType === "all",
        onClick: () => setFilterType("all"),
        badgeLabel: "Total Blasts",
      },
      {
        id: "blog",
        label: "Blog Updates",
        count: blogUpdatesCount.toLocaleString(),
        icon: FileText,
        color: "amber",
        isActive: filterType === "blog",
        onClick: () => setFilterType("blog"),
        badgeLabel: "Automated",
      },
      {
        id: "blast",
        label: "Custom Broadcasts",
        count: customBlastsCount.toLocaleString(),
        icon: Sparkles,
        color: "purple",
        isActive: filterType === "blast",
        onClick: () => setFilterType("blast"),
        badgeLabel: "Manual",
      },
      {
        id: "failed",
        label: "Failed Dispatches",
        count: failedCount.toLocaleString(),
        icon: AlertCircle,
        color: "red",
        isActive: filterType === "failed",
        onClick: () => setFilterType("failed"),
        badgeLabel: failedCount > 0 ? "Retry Available" : undefined,
      },
      {
        id: "delivery",
        label: "Delivery Health",
        count: `${metrics.avgDeliveryRate}%`,
        icon: CheckCircle2,
        color: "emerald",
        isActive: false,
        badgeLabel: `${metrics.totalEmailsSent.toLocaleString()} emails delivered`,
      },
    ],
    [metrics, filterType, blogUpdatesCount, customBlastsCount, failedCount],
  );

  const filterTabs = useMemo<ContentFilterTab[]>(
    () => [
      {
        id: "all",
        label: "All Campaigns",
        count: campaigns.length,
        color: "primary",
      },
      {
        id: "blog",
        label: "Blog Updates",
        count: blogUpdatesCount,
        color: "amber",
      },
      {
        id: "blast",
        label: "Custom Blasts",
        count: customBlastsCount,
        color: "purple",
      },
      {
        id: "failed",
        label: "Delivery Issues",
        count: failedCount,
        color: "red",
      },
    ],
    [campaigns.length, blogUpdatesCount, customBlastsCount, failedCount],
  );

  const columns = useMemo(
    () =>
      getCampaignsColumns({
        onSelectCampaign: (camp) => setSelectedCampaign(camp),
        onRetryCampaign: handleRetryCampaign,
        retryingCampaignId,
      }),
    [retryingCampaignId, handleRetryCampaign],
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AdminTopBar
          breadcrumbs={[
            { label: "Newsletter", href: "/newsletters" },
            { label: "Campaign History", href: "/newsletters/campaigns" },
          ]}
        />

        <main className="flex-1 w-full px-[15px] md:px-[20px] lg:px-[30px] py-4 space-y-5">
          {/* Clean Action Bar with Navigation on Left and Send Button on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/newsletters">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8.5 gap-1.5 cursor-pointer rounded-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  View Subscribers ({metrics.totalSubscribers})
                </Button>
              </Link>
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

          {/* 5 Content Metric Cards */}
          <ContentMetricCards
            cards={metricCards}
            loading={isCampaignsLoading}
          />

          {/* Unified CMS Filter & Search Bar */}
          <ContentFilterBar
            tabs={filterTabs}
            activeTab={filterType}
            onTabChange={(id) => setFilterType(id)}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search campaigns by subject or linked post..."
            extraRightContent={
              <div className="flex items-center gap-1.5 shrink-0">
                {filterType !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterType("all")}
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
                  title="Refresh campaign list"
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
          {isCampaignsLoading ? (
            <div className="rounded-sm border bg-card p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-sm p-6">
              <div className="w-12 h-12 rounded-2xl bg-border/40 text-muted flex items-center justify-center mx-auto mb-3">
                <Clock
                  className="w-6 h-6 text-muted-foreground"
                  strokeWidth={2}
                />
              </div>
              <div className="text-foreground font-semibold text-base mb-1">
                {search
                  ? `No campaigns matching "${search}"`
                  : filterType !== "all"
                    ? `No ${filterType} campaigns found`
                    : "No campaigns dispatched yet"}
              </div>
              <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                {search || filterType !== "all"
                  ? "Try resetting your search query or filter tabs."
                  : "When you publish a new blog post or compose a custom email blast, tracking metrics will appear here."}
              </p>
              <div className="pt-3 flex items-center justify-center gap-2">
                {search || filterType !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFilterType("all");
                    }}
                    className="text-xs h-8 gap-1.5 cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                ) : (
                  <Link href="/newsletters/compose">
                    <Button
                      size="sm"
                      className="text-xs h-8 gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Compose First Blast
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredCampaigns} />
          )}
        </main>

        {/* MODAL: Campaign Details & Diagnostics */}
        <Dialog
          open={Boolean(selectedCampaign)}
          onOpenChange={(open) => !open && setSelectedCampaign(null)}
        >
          <DialogContent className="sm:max-w-3xl md:max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-card">
            <DialogHeader className="p-5 sm:p-6 border-b border-border/70 bg-card/60 backdrop-blur-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                      Campaign Inspection &amp; Delivery Diagnostics
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dispatched on{" "}
                      {selectedCampaign
                        ? format(
                            new Date(selectedCampaign.createdAt),
                            "MMMM d, yyyy 'at' h:mm a",
                          )
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={
                      selectedCampaign?.type === "BLOG_UPDATE"
                        ? "border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs px-2.5 py-0.5 font-semibold"
                        : "border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs px-2.5 py-0.5 font-semibold"
                    }
                  >
                    {selectedCampaign?.type === "BLOG_UPDATE"
                      ? "Blog Update"
                      : "Custom Blast"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize px-2.5 py-0.5 font-semibold ${
                      selectedCampaign?.status === "completed"
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                        : selectedCampaign?.status === "processing"
                          ? "border-blue-500/30 text-blue-400 bg-blue-500/10 animate-pulse"
                          : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                    }`}
                  >
                    {selectedCampaign?.status}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Delivery Stats Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Total Recipients
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {selectedCampaign?.totalRecipients || 0}
                    </span>
                    <Users className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-500 font-semibold">
                    Delivered
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold tracking-tight text-emerald-400">
                      {selectedCampaign?.successCount || 0}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>

                <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-rose-500 font-semibold">
                    Failed
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold tracking-tight text-rose-400">
                      {selectedCampaign?.failedCount || 0}
                    </span>
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Success Rate
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {selectedCampaign && selectedCampaign.totalRecipients > 0
                        ? Math.round(
                            (selectedCampaign.successCount /
                              selectedCampaign.totalRecipients) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                    <Percent className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                </div>
              </div>

              {/* Subject & Linked Blog */}
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5 shadow-2xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Email Subject Line
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground mt-0.5">
                    {selectedCampaign?.subject}
                  </h3>
                </div>

                {selectedCampaign?.blog && (
                  <div className="pt-2.5 border-t border-border/70 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Linked Article:{" "}
                      <strong className="text-foreground ml-1">
                        {selectedCampaign.blog.title}
                      </strong>
                    </span>
                    <a
                      href={`https://ysinnovations.com/blogs/${selectedCampaign.blog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-500 hover:text-amber-400 inline-flex items-center gap-1 font-semibold text-xs"
                    >
                      <span>View live post</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Diagnostic Error Box (If failures exist) */}
              {selectedCampaign && selectedCampaign.failedCount > 0 && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-rose-500/20 text-rose-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      </div>
                      <div>
                        <span className="font-semibold text-rose-400 text-xs sm:text-sm block">
                          Delivery Diagnostic Trace
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Delivery exception logged during dispatch
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetryCampaign(selectedCampaign.id)}
                      disabled={
                        retryingCampaignId === selectedCampaign.id ||
                        selectedCampaign.status === "processing"
                      }
                      className="h-8 px-3 text-xs text-rose-300 border-rose-500/40 hover:bg-rose-500/20 gap-1.5 cursor-pointer font-medium shrink-0"
                    >
                      {retryingCampaignId === selectedCampaign.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>
                        Resend to Failed ({selectedCampaign.failedCount})
                      </span>
                    </Button>
                  </div>

                  {parsedErrorInfo?.error && (
                    <div className="font-mono text-xs bg-black/60 p-3 rounded-lg border border-rose-500/20 text-rose-300 break-words leading-relaxed">
                      {parsedErrorInfo.error}
                    </div>
                  )}

                  {parsedErrorInfo?.failedEmails &&
                    parsedErrorInfo.failedEmails.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] text-muted-foreground font-medium block">
                          Affected Recipients (
                          {parsedErrorInfo.failedEmails.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-black/40 rounded-lg border border-border/60">
                          {parsedErrorInfo.failedEmails.map((email, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[10px] font-mono px-2 py-0.5 border border-rose-500/20 text-rose-300 bg-rose-500/10"
                            >
                              {email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Email Body Content Preview */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Email Dispatch Preview
                </span>
                <div className="rounded-xl border border-border bg-[#050505] p-3 sm:p-4 text-white overflow-hidden shadow-inner">
                  <div className="rounded-lg border border-[#1f242d] bg-[#0a0c10] overflow-hidden">
                    <div className="p-3.5 bg-gradient-to-r from-[#0a0c10] to-[#121622] border-b border-[#1f242d] flex items-center justify-between">
                      <img
                        src={BRAND_LOGO_URL}
                        alt="YS Innovations"
                        className="h-6 w-auto object-contain"
                      />
                      <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        {selectedCampaign?.type === "BLOG_UPDATE"
                          ? "BLOG"
                          : "ANNOUNCEMENT"}
                      </span>
                    </div>
                    <div className="p-4 sm:p-5 max-h-72 overflow-y-auto text-xs leading-relaxed text-gray-300">
                      {selectedCampaign?.bodyHtml ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formatEmailBody(selectedCampaign.bodyHtml),
                          }}
                          className="space-y-2 whitespace-pre-wrap [&_p]:mb-2 [&_a]:text-amber-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-gray-200"
                        />
                      ) : (
                        <p className="text-gray-500 italic">
                          No HTML content preview available for this campaign.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border bg-card/60 backdrop-blur-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCampaign(null)}
                className="text-xs ml-auto cursor-pointer h-9 px-4"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
