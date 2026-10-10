"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Users,
  UserCheck,
  UserX,
  Mail,
  Download,
  Plus,
  Loader2,
  RefreshCw,
  Upload,
  RotateCcw,
  FilterX,
  CheckCircle2,
  Send,
} from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { ConfirmModal } from "@/components/global-modal";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"csv" | "manual">("manual");
  const [newEmailsInput, setNewEmailsInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedEmails, setCsvParsedEmails] = useState<string[]>([]);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isAddingSubscribers, setIsAddingSubscribers] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const manualParsedEmails = useMemo(() => {
    if (!newEmailsInput.trim()) return [];
    const matches = newEmailsInput.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    );
    if (!matches) return [];
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  }, [newEmailsInput]);

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
    `/api/newsletters/subscribers?search=${encodeURIComponent(search)}&status=${statusFilter}`,
    fetcher,
    {
      revalidateOnFocus: false,
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

  // Handle CSV file selection & parsing
  function handleCsvFileSelect(file: File) {
    if (!file) return;
    setCsvFile(file);
    setIsParsingCsv(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setCsvParsedEmails([]);
          return;
        }
        const matches = text.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        );
        const unique = Array.from(
          new Set((matches || []).map((em) => em.toLowerCase().trim())),
        );
        setCsvParsedEmails(unique);
        if (unique.length === 0) {
          toast.add({
            title: "No valid email addresses found in file",
            type: "error",
          });
        }
      } catch {
        toast.add({
          title: "Failed to read CSV file",
          type: "error",
        });
      } finally {
        setIsParsingCsv(false);
      }
    };
    reader.onerror = () => {
      setIsParsingCsv(false);
      toast.add({ title: "Failed to read file", type: "error" });
    };
    reader.readAsText(file);
  }

  // Download sample CSV template helper
  function handleDownloadSampleCsv() {
    const sample =
      "email,source\nreader1@example.com,website\nclient@company.com,campaign\n";
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ys_subscribers_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Bulk Add Subscribers (CSV or Manual)
  async function handleAddSubscribers() {
    const emailsToImport =
      addModalTab === "csv" ? csvParsedEmails : manualParsedEmails;

    if (emailsToImport.length === 0) {
      toast.add({
        title: "Please enter or upload at least one valid email address",
        type: "error",
      });
      return;
    }

    setIsAddingSubscribers(true);
    try {
      const res = await fetch("/api/newsletters/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailsToImport,
          source: addModalTab === "csv" ? "admin-csv" : "admin-manual",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsAddModalOpen(false);
        setNewEmailsInput("");
        setCsvFile(null);
        setCsvParsedEmails([]);
        mutateSubscribers();
        mutateMetrics();
        toast.add({
          title:
            data.message || `Processed ${emailsToImport.length} subscriber(s)`,
          type: "success",
        });
      } else {
        toast.add({
          title: data.error || "Failed to import subscribers",
          type: "error",
        });
      }
    } catch {
      toast.add({
        title: "Network error occurred while importing subscribers",
        type: "error",
      });
    } finally {
      setIsAddingSubscribers(false);
    }
  }

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

        <main className="flex-1 w-full px-[15px] md:px-[20px] lg:px-[30px] py-4 space-y-5">
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

        {/* MODAL: Add & Import Subscribers */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl transition-all">
            <DialogHeader className="pb-4 border-b border-border/60">
              <div className="flex items-center gap-3.5">
                <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-extrabold text-foreground tracking-tight">
                    Manage &amp; Import Subscribers
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add new readers manually or bulk import lists via CSV
                    spreadsheet.
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Tab Navigation */}
            <div className="flex border-b border-border/70 mt-3 mb-4 gap-2">
              <button
                type="button"
                onClick={() => setAddModalTab("csv")}
                className={cn(
                  "flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                  addModalTab === "csv"
                    ? "border-amber-500 text-amber-500"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV File</span>
                {csvParsedEmails.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1 bg-amber-500/20 text-amber-400"
                  >
                    {csvParsedEmails.length}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAddModalTab("manual")}
                className={cn(
                  "flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                  addModalTab === "manual"
                    ? "border-amber-500 text-amber-500"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Manual Entry</span>
                {manualParsedEmails.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1 bg-amber-500/20 text-amber-400"
                  >
                    {manualParsedEmails.length}
                  </Badge>
                )}
              </button>
            </div>

            {/* TAB CONTENT: CSV UPLOAD */}
            {addModalTab === "csv" ? (
              <div className="h-[275px] flex flex-col justify-between text-xs">
                {!csvFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleCsvFileSelect(file);
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer",
                      isDraggingFile
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border/80 hover:border-amber-500/50 bg-muted/10 hover:bg-muted/20",
                    )}
                    onClick={() => {
                      document.getElementById("csv-file-input")?.click();
                    }}
                  >
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv,.txt"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCsvFileSelect(file);
                      }}
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="size-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          Click to upload or drag &amp; drop CSV file
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          supports .csv or .txt containing email addresses
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between overflow-hidden gap-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-muted/20 shrink-0">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-foreground text-xs truncate">
                            {csvFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(csvFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvFile(null);
                          setCsvParsedEmails([]);
                        }}
                        className="text-xs text-muted-foreground hover:text-rose-500 cursor-pointer font-medium shrink-0 ml-2"
                      >
                        Change file
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col justify-center">
                      {isParsingCsv ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                          <span>Parsing email addresses from file...</span>
                        </div>
                      ) : csvParsedEmails.length > 0 ? (
                        <div className="h-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex flex-col justify-between overflow-hidden">
                          <div className="flex items-center justify-between mb-1 shrink-0">
                            <span className="text-emerald-500 font-semibold flex items-center gap-1.5 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {csvParsedEmails.length} valid email address
                              {csvParsedEmails.length > 1 ? "es" : ""} found
                            </span>
                          </div>
                          <div className="flex-1 overflow-y-auto flex flex-wrap gap-1 p-1 bg-background/50 rounded-lg">
                            {csvParsedEmails.slice(0, 30).map((em, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-[10px] font-mono px-1.5 py-0.5"
                              >
                                {em}
                              </Badge>
                            ))}
                            {csvParsedEmails.length > 30 && (
                              <span className="text-[10px] text-muted-foreground self-center px-1">
                                +{csvParsedEmails.length - 30} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20">
                          No valid email addresses found in this file.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t border-border/50 shrink-0">
                  <span>Need an example spreadsheet?</span>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="text-amber-500 hover:text-amber-400 underline font-medium cursor-pointer"
                  >
                    download sample csv template
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[275px] flex flex-col justify-between text-xs gap-2">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-muted-foreground">
                    Enter email addresses separated by commas, spaces, or new
                    lines:
                  </span>
                  {manualParsedEmails.length > 0 && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px]"
                    >
                      {manualParsedEmails.length} email
                      {manualParsedEmails.length > 1 ? "s" : ""} detected
                    </Badge>
                  )}
                </div>
                <Textarea
                  placeholder="reader1@example.com&#10;client@company.com, info@agency.com"
                  value={newEmailsInput}
                  onChange={(e) => setNewEmailsInput(e.target.value)}
                  className="font-mono text-xs bg-background leading-relaxed flex-1 resize-none p-3 rounded-xl border border-input"
                />
                <p className="text-[11px] text-muted-foreground shrink-0">
                  Duplicates and invalid emails will be automatically sanitized
                  before adding.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddSubscribers}
                disabled={
                  isAddingSubscribers ||
                  (addModalTab === "csv"
                    ? csvParsedEmails.length === 0
                    : manualParsedEmails.length === 0)
                }
                className="text-xs h-9 bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-semibold cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isAddingSubscribers ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                )}
                {addModalTab === "csv"
                  ? `Import ${csvParsedEmails.length || 0} Subscribers`
                  : `Save ${manualParsedEmails.length || 0} Subscribers`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
