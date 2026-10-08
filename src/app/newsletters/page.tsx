"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  Send,
  Users,
  UserCheck,
  UserX,
  Mail,
  Download,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
  Eye,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { BRAND_LOGO_URL, formatEmailBody } from "@/lib/newsletter/templates";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Subscriber {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  source: string | null;
  createdAt: string;
}

interface Campaign {
  id: string;
  subject: string;
  bodyHtml: string;
  type: "BLOG_UPDATE" | "CUSTOM_BLAST";
  status: "draft" | "processing" | "completed" | "failed";
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  errorMessage?: string | null;
  createdAt: string;
  completedAt: string | null;
  blog?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

interface Metrics {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribedSubscribers: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  avgDeliveryRate: number;
  senderEmail?: string;
  replyTo?: string;
}

export default function NewsletterPage() {
  const [activeTab, setActiveTab] = useState<
    "subscribers" | "campaigns" | "compose"
  >("subscribers");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
  const [retryingCampaignId, setRetryingCampaignId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const manualParsedEmails = useMemo(() => {
    if (!newEmailsInput.trim()) return [];
    const matches = newEmailsInput.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    );
    if (!matches) return [];
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  }, [newEmailsInput]);

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

  // Compose State
  const [blastSubject, setBlastSubject] = useState("");
  const [blastContent, setBlastContent] = useState("");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingBlast, setIsSendingBlast] = useState(false);
  const [isConfirmBlastOpen, setIsConfirmBlastOpen] = useState(false);

  // Data fetching
  const {
    data: campaignsData,
    isLoading: isCampaignsLoading,
    mutate: mutateCampaigns,
  } = useSWR<{ campaigns: Campaign[] }>(
    "/api/newsletters/campaigns",
    fetcher,
    {
      refreshInterval: (latestData) => {
        const isProcessing = latestData?.campaigns?.some(
          (c: Campaign) => c.status === "processing",
        );
        return isProcessing ? 4000 : 0;
      },
      revalidateOnFocus: false,
    },
  );

  const hasProcessingCampaign = Boolean(
    campaignsData?.campaigns?.some((c) => c.status === "processing"),
  );

  const { data: metricsData, mutate: mutateMetrics } = useSWR<{
    metrics: Metrics;
  }>("/api/newsletters/metrics", fetcher, {
    refreshInterval: hasProcessingCampaign ? 4000 : 0,
    revalidateOnFocus: false,
  });

  const {
    data: subscribersData,
    error: subscribersError,
    isLoading: isSubscribersLoading,
    mutate: mutateSubscribers,
  } = useSWR<{ subscribers: Subscriber[] }>(
    `/api/newsletters/subscribers?search=${encodeURIComponent(search)}&status=${statusFilter}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const metrics = metricsData?.metrics || {
    totalSubscribers: 0,
    activeSubscribers: 0,
    unsubscribedSubscribers: 0,
    totalCampaigns: 0,
    totalEmailsSent: 0,
    avgDeliveryRate: 100,
  };

  const subscribers = subscribersData?.subscribers || [];
  const campaigns = campaignsData?.campaigns || [];

  // Retry Failed Recipients Handler
  async function handleRetryCampaign(campaignId: string) {
    setRetryingCampaignId(campaignId);
    try {
      const res = await fetch(`/api/newsletters/campaigns/${campaignId}/retry`, {
        method: "POST",
      });
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
  }

  // Quick Starter Templates
  function applyStarterTemplate(type: "announcement" | "release" | "digest") {
    if (type === "announcement") {
      setBlastSubject("Exciting Announcement from YS Innovations");
      setBlastContent(
        `<p>Dear Readers,</p>\n<p>We are thrilled to share an important milestone with our community today.</p>\n<p>Over the past few months, our team has been working on transforming our core digital experiences to deliver higher reliability and cutting-edge engineering standards.</p>\n<p><a href="https://ysinnovations.com">Explore what's new on our platform &rarr;</a></p>\n<p>Thank you for being part of our journey.</p>\n<p>Warm regards,<br>The YS Innovations Team</p>`
      );
    } else if (type === "release") {
      setBlastSubject("Product Update: Major Performance & Feature Releases");
      setBlastContent(
        `<p>Hello everyone,</p>\n<p>Here is what we shipped this week:</p>\n<ul>\n  <li><strong>Lightning Fast Loading:</strong> Optimized server components for 40% faster render speeds.</li>\n  <li><strong>Enhanced Architecture:</strong> High-reliability newsletter automation with instant 1-click unsubscribe.</li>\n  <li><strong>Refined UI:</strong> Streamlined layouts and smoother interactions.</li>\n</ul>\n<p><a href="https://ysinnovations.com/blogs">Read the full changelog on our blog &rarr;</a></p>`
      );
    } else if (type === "digest") {
      setBlastSubject("Engineering Digest: Architecture & High-Scale Systems");
      setBlastContent(
        `<p>Welcome to this week's curated engineering digest.</p>\n<p>Today we dive deep into resilient system design, rate-limiting patterns, and building modern web apps that scale effortlessly.</p>\n<p><strong>Featured Insights:</strong></p>\n<p>&bull; How we achieve zero-downtime database synchronization.<br>&bull; Optimizing serverless cold starts.<br>&bull; Clean architecture patterns in modern TypeScript.</p>\n<p><a href="https://ysinnovations.com/blogs">Explore our latest engineering articles &rarr;</a></p>`
      );
    }
    toast.add({ title: "Template applied to editor", type: "success" });
  }

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

  // Bulk Add Subscribers (Fast Atomic Single Request for CSV or Manual)
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
            data.message ||
            `Processed ${emailsToImport.length} subscriber(s)`,
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
  async function handleToggleStatus(sub: Subscriber) {
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
    } catch (e) {
      toast.add({ title: "Failed to update subscriber status", type: "error" });
    }
  }

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
    } catch (e) {
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

  // Send Test Email
  async function handleSendTest() {
    if (!blastSubject.trim() || !blastContent.trim()) {
      toast.add({
        title: "Please fill in both subject and message body",
        type: "error",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch("/api/newsletters/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testRecipientEmail.trim() || undefined,
          subject: blastSubject.trim(),
          bodyHtml: formatEmailBody(blastContent),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test email");

      toast.add({
        title: data.message || "Test email delivered to your inbox!",
        type: "success",
      });
    } catch (err: any) {
      toast.add({
        title: err.message || "Error sending test email",
        type: "error",
      });
    } finally {
      setIsSendingTest(false);
    }
  }

  // Dispatch Custom Blast
  async function handleDispatchBlast() {
    setIsSendingBlast(true);
    try {
      const res = await fetch("/api/newsletters/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: blastSubject.trim(),
          bodyHtml: formatEmailBody(blastContent),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch campaign");

      toast.add({
        title: `Campaign queued for ${metrics.activeSubscribers} active subscribers!`,
        type: "success",
      });
      setIsConfirmBlastOpen(false);
      setBlastSubject("");
      setBlastContent("");
      setActiveTab("campaigns");
      mutateCampaigns();
      mutateMetrics();
    } catch (err: any) {
      toast.add({
        title: err.message || "Failed to dispatch campaign",
        type: "error",
      });
    } finally {
      setIsSendingBlast(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <AdminTopBar
        breadcrumbs={[{ label: "Newsletter", href: "/newsletters" }]}
      />

      <main className="flex-1 w-full px-[15px] md:px-[20px] lg:px-[30px] py-6 space-y-6">
        {/* Title Bar & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Send className="w-6 h-6 text-amber-500" />
              Newsletter & Email Marketing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your subscriber list, send custom email blasts, and track
              automated blog dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs h-9 gap-1.5 cursor-pointer"
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
              className="text-xs h-9 gap-1.5 cursor-pointer hover:border-amber-500/50"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              Import CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setAddModalTab("manual");
                setIsAddModalOpen(true);
              }}
              className="text-xs h-9 gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Subscriber
            </Button>
          </div>
        </div>

        {/* Top Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Subscribers */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Active Subscribers
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.activeSubscribers.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                of {metrics.totalSubscribers.toLocaleString()} total
              </span>
            </div>
          </div>

          {/* Unsubscribed */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Unsubscribed
              </span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.unsubscribedSubscribers.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {metrics.totalSubscribers > 0
                  ? `${Math.round((metrics.unsubscribedSubscribers / metrics.totalSubscribers) * 100)}% opt-out`
                  : "0% opt-out"}
              </span>
            </div>
          </div>

          {/* Total Campaigns */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Campaigns Sent
              </span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.totalCampaigns.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                blasts & updates
              </span>
            </div>
          </div>

          {/* Total Emails Delivered */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Delivery Success
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.avgDeliveryRate}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({metrics.totalEmailsSent.toLocaleString()} emails)
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border flex items-center justify-between gap-4">
          <div className="flex gap-2 -mb-px">
            <button
              onClick={() => setActiveTab("subscribers")}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "subscribers"
                  ? "border-amber-500 text-amber-500 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Subscribers ({metrics.totalSubscribers})
            </button>
            <button
              onClick={() => setActiveTab("campaigns")}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "campaigns"
                  ? "border-amber-500 text-amber-500 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-4 h-4" />
              Campaign History ({metrics.totalCampaigns})
            </button>
            <button
              onClick={() => setActiveTab("compose")}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "compose"
                  ? "border-amber-500 text-amber-500 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Compose Blast
            </button>
          </div>
        </div>

        {/* TAB 1: SUBSCRIBERS */}
        {activeTab === "subscribers" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-lg border border-border">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search subscriber by email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="unsubscribed">Unsubscribed Only</option>
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mutateSubscribers()}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                  title="Refresh list"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Subscribed Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isSubscribersLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-48" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-16" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Skeleton className="h-4 w-16 ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : subscribers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center text-muted-foreground"
                        >
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="font-medium">No subscribers found</p>
                          <p className="text-[11px] mt-0.5">
                            {search
                              ? "Try adjusting your search criteria"
                              : "Click '+ Add Subscriber' above to add your first reader."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      subscribers.map((sub) => (
                        <tr
                          key={sub.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {sub.email}
                          </td>
                          <td className="px-4 py-3">
                            {sub.status === "active" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 font-medium text-[10px]">
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground border-border text-[10px]"
                              >
                                Unsubscribed
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">
                            {sub.source || "website"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {format(new Date(sub.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(sub)}
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              title={
                                sub.status === "active"
                                  ? "Mark as Unsubscribed"
                                  : "Re-activate"
                              }
                            >
                              {sub.status === "active" ? (
                                <span className="flex items-center gap-1 text-rose-400">
                                  <UserX className="w-3.5 h-3.5" />
                                  Opt-out
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Activate
                                </span>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTargetId(sub.id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAMPAIGN HISTORY */}
        {activeTab === "campaigns" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3">Campaign Subject</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Progress</th>
                      <th className="px-4 py-3">Date Dispatched</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isCampaignsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-48" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-16" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-32" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Skeleton className="h-7 w-24 ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : campaigns.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-muted-foreground"
                        >
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="font-medium">
                            No campaigns dispatched yet
                          </p>
                          <p className="text-[11px] mt-0.5">
                            When you publish a blog or compose a custom blast,
                            tracking will appear here.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((camp) => (
                        <tr
                          key={camp.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{camp.subject}</span>
                              {camp.blog && (
                                <a
                                  href={`/blogs/edit/${camp.blog.id}`}
                                  target="_blank"
                                  className="text-amber-500 hover:underline flex items-center gap-0.5 text-[10px]"
                                >
                                  View Blog{" "}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {camp.type === "BLOG_UPDATE" ? (
                              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20 font-medium text-[10px]">
                                Blog Update
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 font-medium text-[10px]">
                                Custom Blast
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {camp.status === "completed" ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                Completed
                              </span>
                            ) : camp.status === "processing" ? (
                              <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                                Sending...
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
                                <AlertCircle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>
                                  {camp.successCount} / {camp.totalRecipients}{" "}
                                  sent
                                </span>
                                {camp.failedCount > 0 && (
                                  <span className="text-rose-400">
                                    ({camp.failedCount} failed)
                                  </span>
                                )}
                              </div>
                              <div className="w-36 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-1.5 transition-all duration-500"
                                  style={{
                                    width: `${
                                      camp.totalRecipients > 0
                                        ? Math.round(
                                            (camp.successCount /
                                              camp.totalRecipients) *
                                              100,
                                          )
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {format(
                              new Date(camp.createdAt),
                              "MMM d, yyyy h:mm a",
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedCampaign(camp)}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                                title="View delivery breakdown and error details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Details</span>
                              </Button>
                              {camp.failedCount > 0 ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetryCampaign(camp.id)}
                                  disabled={
                                    retryingCampaignId === camp.id ||
                                    camp.status === "processing"
                                  }
                                  className="h-7 px-2.5 text-xs text-amber-500 hover:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 cursor-pointer font-medium"
                                  title="Resend email only to failed recipients"
                                >
                                  {retryingCampaignId === camp.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                  <span>Resend ({camp.failedCount})</span>
                                </Button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground font-medium px-2">
                                  Delivered
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMPOSE CUSTOM BLAST */}
        {activeTab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Compose Form */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Write Custom Announcement
                </h2>
                <p className="text-xs text-muted-foreground">
                  Send a direct announcement, promotion, or company newsletter
                  to all active subscribers.
                </p>
              </div>

              {/* Sender Info Badge */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">Sender: </span>
                  <strong className="text-foreground">
                    {metrics.senderEmail || "Active Configured Provider"}
                  </strong>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-400 border-emerald-500/30"
                >
                  {metrics.activeSubscribers} Active Recipients
                </Badge>
              </div>

              {/* Quick Starter Templates */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Quick Starter Templates:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyStarterTemplate("announcement")}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
                  >
                    📢 Announcement
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStarterTemplate("release")}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
                  >
                    🚀 Product Release
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStarterTemplate("digest")}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
                  >
                    📚 Tech Digest
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Email Subject Line <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Exciting Announcement from YS Innovations!"
                  value={blastSubject}
                  onChange={(e) => setBlastSubject(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Message Body <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="text-[10px]">Insert:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setBlastContent((prev) =>
                          prev ? prev.trimEnd() + "\n\n" : "",
                        )
                      }
                      className="px-2 py-0.5 rounded bg-muted/70 hover:bg-muted text-foreground text-[10px] font-medium border border-border/60 transition-colors cursor-pointer"
                      title="Add a new paragraph"
                    >
                      &para; Paragraph
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBlastContent((prev) =>
                          prev ? prev + "\n" : "",
                        )
                      }
                      className="px-2 py-0.5 rounded bg-muted/70 hover:bg-muted text-foreground text-[10px] font-medium border border-border/60 transition-colors cursor-pointer"
                      title="Add a line break"
                    >
                      &crarr; Line Break
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBlastContent((prev) =>
                          prev + "<strong>Important</strong>",
                        )
                      }
                      className="px-2 py-0.5 rounded bg-muted/70 hover:bg-muted text-foreground text-[10px] font-medium border border-border/60 transition-colors cursor-pointer"
                      title="Add bold text"
                    >
                      Bold
                    </button>
                  </div>
                </div>
                <Textarea
                  placeholder="Type your message here...&#10;&#10;Press Enter to create new lines and paragraphs naturally, or use HTML tags like <p>, <strong>, etc."
                  value={blastContent}
                  onChange={(e) => setBlastContent(e.target.value)}
                  rows={10}
                  className="text-xs font-mono leading-relaxed resize-y bg-background"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pressing Enter creates real line breaks and paragraphs automatically. Supports HTML formatting as well.
                </p>
              </div>

              {/* Action Buttons & Test Recipient */}
              <div className="pt-2 space-y-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Test Recipient Email (optional, defaults to your admin account):
                    </label>
                    <Input
                      type="email"
                      placeholder="e.g. test-account@company.com"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendTest}
                    disabled={isSendingTest || !blastSubject || !blastContent}
                    className="text-xs h-8 gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
                  >
                    {isSendingTest ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    Send Preview Test
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setIsConfirmBlastOpen(true)}
                    disabled={
                      isSendingBlast ||
                      !blastSubject ||
                      !blastContent ||
                      metrics.activeSubscribers === 0
                    }
                    className="text-xs h-9 gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Blast to {metrics.activeSubscribers} Subscribers
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Real-time Live Preview */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-500" /> Live Inbox Preview
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Formatted exactly as subscribers receive it
                </span>
              </div>

              {/* Preview Container */}
              <div className="rounded-xl border border-border/80 bg-[#050505] p-4 overflow-hidden shadow-inner text-white">
                <div className="max-w-[540px] mx-auto bg-[#0a0c10] rounded-xl border border-[#1f242d] overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="p-4 bg-gradient-to-r from-[#0a0c10] to-[#121622] border-b border-[#1f242d] flex items-center justify-between">
                    <img
                      src={BRAND_LOGO_URL}
                      alt="YS Innovations"
                      className="h-7 w-auto object-contain"
                    />
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 tracking-wider">
                      ANNOUNCEMENT
                    </span>
                  </div>

                  {/* Subject preview */}
                  <div className="px-5 pt-4 pb-3 border-b border-[#1f242d]/80 bg-[#0c0f16]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                      Subject Line
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {blastSubject || "Your Subject Line Will Appear Here"}
                    </h4>
                  </div>

                  {/* Body preview */}
                  <div className="p-5 text-xs leading-relaxed text-gray-300 min-h-[180px] bg-[#0a0c10]">
                    {blastContent ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formatEmailBody(blastContent),
                        }}
                        className="space-y-3 whitespace-pre-wrap leading-relaxed [&_p]:mb-3 [&_p]:leading-relaxed [&_a]:text-amber-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-white"
                      />
                    ) : (
                      <p className="text-gray-500 italic">
                        Type your message on the left to see the live formatted
                        preview here...
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-[#06070a] border-t border-[#1f242d] text-center text-[10px] text-gray-500 space-y-1">
                    <p className="font-bold text-[#F5A817] tracking-tight">
                      YS Innovations
                    </p>
                    <p className="italic text-gray-400 text-[9px]">
                      Innovate Today, Lead Tomorrow!
                    </p>
                    <p className="text-gray-500 pt-1">
                      You received this email because you subscribed to our
                      newsletter at ysinnovations.com.
                    </p>
                    <p className="text-rose-400/80 underline pt-0.5">
                      Unsubscribe from our updates
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Campaign Details & Diagnostics */}
        <Dialog
          open={Boolean(selectedCampaign)}
          onOpenChange={(open) => !open && setSelectedCampaign(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
            <DialogHeader className="p-5 border-b border-border bg-card">
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Campaign Inspection & Delivery Diagnostics
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      selectedCampaign?.type === "BLOG_UPDATE"
                        ? "border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px]"
                        : "border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px]"
                    }
                  >
                    {selectedCampaign?.type === "BLOG_UPDATE"
                      ? "Blog Update"
                      : "Custom Blast"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
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
              <span className="text-xs text-muted-foreground mt-1 block">
                Dispatched on{" "}
                {selectedCampaign
                  ? format(
                      new Date(selectedCampaign.createdAt),
                      "MMMM d, yyyy 'at' h:mm a",
                    )
                  : ""}
              </span>
            </DialogHeader>

            <div className="overflow-y-auto p-5 space-y-4 text-xs">
              {/* Subject & Linked Blog */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Subject Line
                  </span>
                  <h3 className="text-sm font-semibold text-foreground mt-0.5">
                    {selectedCampaign?.subject}
                  </h3>
                </div>

                {selectedCampaign?.blog && (
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Linked Article:{" "}
                      <strong className="text-foreground">
                        {selectedCampaign.blog.title}
                      </strong>
                    </span>
                    <a
                      href={`https://ysinnovations.com/blogs/${selectedCampaign.blog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-500 hover:text-amber-400 inline-flex items-center gap-1 font-medium text-[11px]"
                    >
                      <span>View live</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Delivery Stats Breakdown */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                    Total
                  </span>
                  <span className="text-base font-bold text-foreground mt-1 block">
                    {selectedCampaign?.totalRecipients || 0}
                  </span>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <span className="text-[10px] uppercase text-emerald-500 font-semibold block">
                    Delivered
                  </span>
                  <span className="text-base font-bold text-emerald-400 mt-1 block">
                    {selectedCampaign?.successCount || 0}
                  </span>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                  <span className="text-[10px] uppercase text-rose-500 font-semibold block">
                    Failed
                  </span>
                  <span className="text-base font-bold text-rose-400 mt-1 block">
                    {selectedCampaign?.failedCount || 0}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                    Success Rate
                  </span>
                  <span className="text-base font-bold text-foreground mt-1 block">
                    {selectedCampaign && selectedCampaign.totalRecipients > 0
                      ? Math.round(
                          (selectedCampaign.successCount /
                            selectedCampaign.totalRecipients) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>

              {/* Diagnostic Error Box (If failures exist) */}
              {selectedCampaign && selectedCampaign.failedCount > 0 && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-semibold text-rose-400 text-xs">
                        Delivery Error Details
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetryCampaign(selectedCampaign.id)}
                      disabled={
                        retryingCampaignId === selectedCampaign.id ||
                        selectedCampaign.status === "processing"
                      }
                      className="h-7 px-2.5 text-xs text-rose-300 border-rose-500/30 hover:bg-rose-500/20 gap-1.5 cursor-pointer font-medium"
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
                    <div className="font-mono text-[11px] bg-background/80 p-2.5 rounded border border-border/80 text-rose-300 break-words">
                      {parsedErrorInfo.error}
                    </div>
                  )}

                  {parsedErrorInfo?.failedEmails &&
                    parsedErrorInfo.failedEmails.length > 0 && (
                      <div>
                        <span className="text-[11px] text-muted-foreground font-medium block mb-1.5">
                          Failed Recipients ({parsedErrorInfo.failedEmails.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-background/40 rounded border border-border/60">
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
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Email Content Snapshot
                </span>
                <div className="rounded-xl border border-border bg-[#050505] p-3 text-white overflow-hidden shadow-inner">
                  <div className="rounded-lg border border-[#1f242d] bg-[#0a0c10] overflow-hidden">
                    <div className="p-3 bg-gradient-to-r from-[#0a0c10] to-[#121622] border-b border-[#1f242d] flex items-center justify-between">
                      <img
                        src={BRAND_LOGO_URL}
                        alt="YS Innovations"
                        className="h-6 w-auto object-contain"
                      />
                      <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {selectedCampaign?.type === "BLOG_UPDATE" ? "BLOG" : "ANNOUNCEMENT"}
                      </span>
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto text-xs leading-relaxed text-gray-300">
                      {selectedCampaign?.bodyHtml ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formatEmailBody(selectedCampaign.bodyHtml),
                          }}
                          className="space-y-2 whitespace-pre-wrap [&_p]:mb-2 [&_a]:text-amber-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1"
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

            <DialogFooter className="p-4 border-t border-border bg-card">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCampaign(null)}
                className="text-xs ml-auto cursor-pointer"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    Manage & Import Subscribers
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add new readers manually or bulk import lists via CSV spreadsheet.
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
                    : "border-transparent text-muted-foreground hover:text-foreground"
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
                    : "border-transparent text-muted-foreground hover:text-foreground"
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
              <div className="space-y-4 py-1 text-xs">
                {/* Drag-and-drop zone */}
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
                    "relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
                    isDraggingFile
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border/80 hover:border-amber-500/50 bg-muted/10 hover:bg-muted/20"
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
                    <div className="size-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    {csvFile ? (
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {csvFile.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {(csvFile.size / 1024).toFixed(1)} KB &bull; Click to choose a different file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          Click to upload or drag & drop CSV file
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Supports .csv or .txt containing email addresses
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parsed email status */}
                {isParsingCsv ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span>Parsing email addresses from file...</span>
                  </div>
                ) : csvParsedEmails.length > 0 ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {csvParsedEmails.length} valid email address{csvParsedEmails.length > 1 ? "es" : ""} ready to import
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvFile(null);
                          setCsvParsedEmails([]);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-rose-400 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-background/50 rounded-lg">
                      {csvParsedEmails.slice(0, 15).map((em, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[10px] font-mono px-1.5 py-0.5"
                        >
                          {em}
                        </Badge>
                      ))}
                      {csvParsedEmails.length > 15 && (
                        <span className="text-[10px] text-muted-foreground self-center px-1">
                          +{csvParsedEmails.length - 15} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Template download helper */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/50">
                  <span>Need an example spreadsheet?</span>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="text-amber-500 hover:text-amber-400 underline font-medium cursor-pointer"
                  >
                    Download Sample CSV Template
                  </button>
                </div>
              </div>
            ) : (
              /* TAB CONTENT: MANUAL ENTRY */
              <div className="space-y-3 py-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Enter email addresses separated by commas, spaces, or new lines:
                  </span>
                  {manualParsedEmails.length > 0 && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px]"
                    >
                      {manualParsedEmails.length} email{manualParsedEmails.length > 1 ? "s" : ""} detected
                    </Badge>
                  )}
                </div>
                <Textarea
                  placeholder="reader1@example.com&#10;client@company.com, info@agency.com"
                  value={newEmailsInput}
                  onChange={(e) => setNewEmailsInput(e.target.value)}
                  rows={6}
                  className="font-mono text-xs bg-background leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Duplicates and invalid emails will be automatically sanitized before adding.
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
                className="text-xs h-9 bg-amber-500 hover:bg-amber-600 text-black font-semibold cursor-pointer shadow-xs"
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

        {/* CONFIRMATION: Send Blast using ConfirmModal */}
        <ConfirmModal
          open={isConfirmBlastOpen}
          onOpenChange={setIsConfirmBlastOpen}
          variant="warning"
          title="Dispatch Email Blast?"
          description={
            <div className="space-y-2 text-xs">
              <p>
                You are about to broadcast{" "}
                <strong>&ldquo;{blastSubject}&rdquo;</strong> to{" "}
                <strong>{metrics.activeSubscribers} active subscribers</strong>.
              </p>
              <p className="text-muted-foreground">
                The batch engine will safely dispatch emails in chunks of 50 with automatic 1-click unsubscribe links.
              </p>
            </div>
          }
          confirmText="Confirm & Send"
          onConfirm={handleDispatchBlast}
          loading={isSendingBlast}
        />
      </main>
    </div>
  );
}
