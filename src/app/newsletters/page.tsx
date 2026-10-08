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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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
  const [activeTab, setActiveTab] = useState<"subscribers" | "campaigns" | "compose">("subscribers");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmailsInput, setNewEmailsInput] = useState("");
  const [isAddingSubscribers, setIsAddingSubscribers] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compose State
  const [blastSubject, setBlastSubject] = useState("");
  const [blastContent, setBlastContent] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingBlast, setIsSendingBlast] = useState(false);
  const [isConfirmBlastOpen, setIsConfirmBlastOpen] = useState(false);

  // Data fetching
  const { data: metricsData, mutate: mutateMetrics } = useSWR<{ metrics: Metrics }>(
    "/api/newsletters/metrics",
    fetcher,
    { refreshInterval: 10000 }
  );

  const {
    data: subscribersData,
    error: subscribersError,
    isLoading: isSubscribersLoading,
    mutate: mutateSubscribers,
  } = useSWR<{ subscribers: Subscriber[] }>(
    `/api/newsletters/subscribers?search=${encodeURIComponent(search)}&status=${statusFilter}`,
    fetcher
  );

  const {
    data: campaignsData,
    isLoading: isCampaignsLoading,
    mutate: mutateCampaigns,
  } = useSWR<{ campaigns: Campaign[] }>(
    "/api/newsletters/campaigns",
    fetcher,
    { refreshInterval: 8000 }
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

  // Add Subscribers
  async function handleAddSubscribers() {
    const raw = newEmailsInput.trim();
    if (!raw) {
      toast.add({ title: "Please enter at least one email address", type: "error" });
      return;
    }

    const emails = raw
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) {
      toast.add({ title: "No valid email addresses found", type: "error" });
      return;
    }

    setIsAddingSubscribers(true);
    let addedCount = 0;

    for (const email of emails) {
      try {
        const res = await fetch("/api/newsletters/subscribers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "admin" }),
        });
        if (res.ok) addedCount++;
      } catch (e) {
        console.error(e);
      }
    }

    setIsAddingSubscribers(false);
    setIsAddModalOpen(false);
    setNewEmailsInput("");
    mutateSubscribers();
    mutateMetrics();

    toast.add({
      title: `Successfully added ${addedCount} subscriber${addedCount > 1 ? "s" : ""}`,
      type: "success",
    });
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
      const res = await fetch(`/api/newsletters/subscribers/${deleteTargetId}`, {
        method: "DELETE",
      });
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
      toast.add({ title: "Please fill in both subject and message body", type: "error" });
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch("/api/newsletters/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: blastSubject,
          bodyHtml: blastContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test email");

      toast.add({
        title: data.message || "Test email delivered to your inbox!",
        type: "success",
      });
    } catch (err: any) {
      toast.add({ title: err.message || "Error sending test email", type: "error" });
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
          subject: blastSubject,
          bodyHtml: blastContent,
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
      toast.add({ title: err.message || "Failed to dispatch campaign", type: "error" });
    } finally {
      setIsSendingBlast(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <AdminTopBar breadcrumbs={[{ label: "Newsletter", href: "/newsletters" }]} />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Title Bar & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Send className="w-6 h-6 text-amber-500" />
              Newsletter & Email Marketing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your subscriber list, send custom email blasts, and track automated blog dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs h-9 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs h-9 gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
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
              <span className="text-xs font-medium text-muted-foreground">Active Subscribers</span>
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
              <span className="text-xs font-medium text-muted-foreground">Unsubscribed</span>
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
              <span className="text-xs font-medium text-muted-foreground">Campaigns Sent</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.totalCampaigns.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">blasts & updates</span>
            </div>
          </div>

          {/* Total Emails Delivered */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Delivery Success</span>
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
                          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        </tr>
                      ))
                    ) : subscribers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
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
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {sub.email}
                          </td>
                          <td className="px-4 py-3">
                            {sub.status === "active" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 font-medium text-[10px]">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
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
                              title={sub.status === "active" ? "Mark as Unsubscribed" : "Re-activate"}
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isCampaignsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        </tr>
                      ))
                    ) : campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="font-medium">No campaigns dispatched yet</p>
                          <p className="text-[11px] mt-0.5">
                            When you publish a blog or compose a custom blast, tracking will appear here.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{camp.subject}</span>
                              {camp.blog && (
                                <a
                                  href={`/blogs/edit/${camp.blog.id}`}
                                  target="_blank"
                                  className="text-amber-500 hover:underline flex items-center gap-0.5 text-[10px]"
                                >
                                  View Blog <ExternalLink className="w-2.5 h-2.5" />
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
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                              </span>
                            ) : camp.status === "processing" ? (
                              <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
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
                                  {camp.successCount} / {camp.totalRecipients} sent
                                </span>
                                {camp.failedCount > 0 && (
                                  <span className="text-rose-400">({camp.failedCount} failed)</span>
                                )}
                              </div>
                              <div className="w-36 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-1.5 transition-all duration-500"
                                  style={{
                                    width: `${
                                      camp.totalRecipients > 0
                                        ? Math.round((camp.successCount / camp.totalRecipients) * 100)
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {format(new Date(camp.createdAt), "MMM d, yyyy h:mm a")}
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
                <h2 className="text-base font-semibold text-foreground">Write Custom Announcement</h2>
                <p className="text-xs text-muted-foreground">
                  Send a direct announcement, promotion, or company newsletter to all active subscribers.
                </p>
              </div>

              {/* Sender Info Badge */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">Sender: </span>
                  <strong className="text-foreground">{metrics.senderEmail || "Active Configured Provider"}</strong>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                  {metrics.activeSubscribers} Active Recipients
                </Badge>
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
                <label className="text-xs font-medium text-foreground">
                  Message Body (HTML or Plain Text) <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  placeholder="<p>Dear Readers,</p><p>We are thrilled to announce our latest updates...</p>"
                  value={blastContent}
                  onChange={(e) => setBlastContent(e.target.value)}
                  rows={10}
                  className="text-xs font-mono leading-relaxed resize-y"
                />
                <p className="text-[11px] text-muted-foreground">
                  Supports clean HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;strong&gt;, &lt;a href="..."&gt;, &lt;ul&gt;, etc.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTest}
                  disabled={isSendingTest || !blastSubject || !blastContent}
                  className="text-xs h-9 gap-1.5"
                >
                  {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  Send Test Preview to Me
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsConfirmBlastOpen(true)}
                  disabled={isSendingBlast || !blastSubject || !blastContent || metrics.activeSubscribers === 0}
                  className="text-xs h-9 gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Blast to {metrics.activeSubscribers} Subscribers
                </Button>
              </div>
            </div>

            {/* Right: Real-time Live Preview */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-500" /> Live Inbox Preview
                </h3>
                <span className="text-[11px] text-muted-foreground">How subscribers will see it</span>
              </div>

              {/* Preview Container */}
              <div className="rounded-xl border border-border/80 bg-[#0b0f17] p-4 overflow-hidden shadow-inner text-white">
                <div className="max-w-[520px] mx-auto bg-[#111827] rounded-xl border border-[#1f2937] overflow-hidden">
                  {/* Header */}
                  <div className="p-4 bg-gradient-to-r from-[#111827] to-[#1a2234] border-b border-[#1f2937] flex items-center justify-between">
                    <span className="font-bold text-sm tracking-tight text-white">
                      YS <span className="text-amber-500">INNOVATIONS</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      SPECIAL UPDATE
                    </span>
                  </div>

                  {/* Subject preview */}
                  <div className="px-5 pt-4 pb-2 border-b border-[#1f2937]/50">
                    <h4 className="text-sm font-bold text-white">
                      {blastSubject || "Your Subject Line Will Appear Here"}
                    </h4>
                  </div>

                  {/* Body preview */}
                  <div className="p-5 text-xs leading-relaxed text-gray-300 min-h-[160px]">
                    {blastContent ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: blastContent }}
                        className="space-y-2 [&_p]:mb-2 [&_a]:text-amber-400 [&_a]:underline"
                      />
                    ) : (
                      <p className="text-gray-500 italic">
                        Type your message on the left to see the live formatted preview here...
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-[#0d131f] border-t border-[#1f2937] text-center text-[10px] text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-400">YS Innovations &bull; Innovate Today, Lead Tomorrow!</p>
                    <p>You received this email because you subscribed to our newsletter.</p>
                    <p className="text-rose-400 underline">Unsubscribe from our updates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add Subscribers */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                Add Subscribers
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground">
                Enter email addresses below. You can enter a single email or multiple emails separated by commas or line breaks.
              </p>
              <Textarea
                placeholder="reader1@example.com&#10;client@company.com, info@agency.com"
                value={newEmailsInput}
                onChange={(e) => setNewEmailsInput(e.target.value)}
                rows={5}
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddSubscribers}
                disabled={isAddingSubscribers || !newEmailsInput.trim()}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {isAddingSubscribers ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Save Subscribers
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CONFIRMATION: Delete Subscriber */}
        <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Subscriber?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                This subscriber will be permanently deleted from the database. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSubscriber}
                disabled={isDeleting}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CONFIRMATION: Send Blast */}
        <AlertDialog open={isConfirmBlastOpen} onOpenChange={setIsConfirmBlastOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-500" />
                Dispatch Email Blast?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs space-y-2">
                <p>
                  You are about to broadcast <strong>&ldquo;{blastSubject}&rdquo;</strong> to{" "}
                  <strong>{metrics.activeSubscribers} active subscribers</strong>.
                </p>
                <p className="text-muted-foreground">
                  The batch engine will safely dispatch emails in chunks of 50 with automatic 1-click unsubscribe links.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDispatchBlast}
                disabled={isSendingBlast}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {isSendingBlast ? "Queuing Dispatch..." : "Confirm & Send"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
