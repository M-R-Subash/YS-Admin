"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Search,
  Filter,
  Download,
  Shield,
  FileText,
  RefreshCw,
  Clock,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  Loader2,
  BookOpen,
  Image as ImageIcon,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { formatDistanceToNow, format } from "date-fns";

export type AuditCategory =
  | "BLOGS"
  | "PAGES"
  | "MEDIA"
  | "COMMENTS"
  | "USERS"
  | "SETTINGS"
  | "AUTH"
  | "SECURITY";

export interface AuditLogItem {
  id: string;
  eventType: string;
  category: AuditCategory;
  action: string;
  actor: {
    name: string;
    email: string;
    avatar?: string;
    role: "ADMIN" | "EDITOR";
  };
  target: string;
  ipAddress: string;
  status: "SUCCESS" | "WARNING" | "FAILED";
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AuditLogsResponse {
  logs: AuditLogItem[];
  total: number;
  stats: {
    totalEvents: number;
    blogEvents: number;
    pageEvents: number;
    mediaEvents: number;
    otherEvents: number;
    retentionDays: number;
  };
}

const CATEGORY_FILTERS: { key: string; label: string; icon: any }[] = [
  { key: "ALL", label: "All Activity", icon: Layers },
  { key: "BLOGS", label: "Blogs", icon: BookOpen },
  { key: "PAGES", label: "Pages", icon: FileText },
  { key: "MEDIA", label: "Media", icon: ImageIcon },
  { key: "COMMENTS", label: "Comments", icon: MessageSquare },
  { key: "USERS", label: "Users", icon: Users },
  { key: "SETTINGS", label: "Settings", icon: SettingsIcon },
  { key: "SECURITY", label: "Security & Auth", icon: Shield },
];

function getCategoryColor(category: string): string {
  switch (category) {
    case "BLOGS":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "PAGES":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "MEDIA":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "COMMENTS":
      return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
    case "USERS":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "SETTINGS":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    case "SECURITY":
    case "AUTH":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
  }
}

function getEventBadgeLabel(eventType: string): { label: string; variant: "success" | "warning" | "destructive" | "info" | "neutral" } {
  switch (eventType) {
    case "BLOG.PUBLISHED":
      return { label: "Blog Published", variant: "success" };
    case "BLOG.CREATED":
      return { label: "Draft Created", variant: "info" };
    case "BLOG.SET_TO_DRAFT":
      return { label: "Set to Draft", variant: "info" };
    case "BLOG.UPDATED":
      return { label: "Blog Updated", variant: "info" };
    case "BLOG.TRASHED":
      return { label: "Moved to Trash", variant: "warning" };
    case "BLOG.RESTORED":
      return { label: "Restored", variant: "success" };
    case "BLOG.PERMANENTLY_DELETED":
      return { label: "Deleted Permanently", variant: "destructive" };
    case "BLOG.BULK_PUBLISH":
    case "BLOG.BULK_PUBLISHED":
      return { label: "Bulk Published", variant: "success" };
    case "BLOG.BULK_DRAFT":
      return { label: "Bulk Drafted", variant: "info" };
    case "BLOG.BULK_TRASH":
      return { label: "Bulk Trashed", variant: "warning" };
    case "BLOG.BULK_RESTORE":
      return { label: "Bulk Restored", variant: "success" };
    case "BLOG.BULK_DELETEPERMANENT":
      return { label: "Bulk Deleted", variant: "destructive" };

    case "PAGE.PUBLISHED":
      return { label: "Page Published", variant: "success" };
    case "PAGE.SET_TO_DRAFT":
      return { label: "Set to Draft", variant: "info" };
    case "PAGE.UPDATED":
      return { label: "Page Updated", variant: "info" };
    case "PAGE.SEO_UPDATED":
      return { label: "SEO Configured", variant: "info" };
    case "PAGE.BULK_UPDATED":
      return { label: "Bulk Updated", variant: "info" };
    case "PAGE.TRASHED":
      return { label: "Moved to Trash", variant: "warning" };
    case "PAGE.RESTORED":
      return { label: "Restored", variant: "success" };
    case "PAGE.PERMANENTLY_DELETED":
      return { label: "Deleted Permanently", variant: "destructive" };
    case "PAGE.BULK_PUBLISH":
      return { label: "Bulk Published", variant: "success" };
    case "PAGE.BULK_DRAFT":
      return { label: "Bulk Drafted", variant: "info" };
    case "PAGE.BULK_TRASH":
      return { label: "Bulk Trashed", variant: "warning" };
    case "PAGE.BULK_RESTORE":
      return { label: "Bulk Restored", variant: "success" };
    case "PAGE.BULK_DELETEPERMANENT":
      return { label: "Bulk Deleted", variant: "destructive" };

    case "MEDIA.DELETED":
      return { label: "Asset Deleted", variant: "warning" };

    case "COMMENT.APPROVED":
      return { label: "Comment Approved", variant: "success" };
    case "COMMENT.UNAPPROVED":
      return { label: "Comment Hidden", variant: "neutral" };
    case "COMMENT.TRASHED":
      return { label: "Comment Trashed", variant: "warning" };
    case "COMMENT.RESTORED":
      return { label: "Comment Restored", variant: "success" };
    case "COMMENT.PERMANENTLY_DELETED":
      return { label: "Comment Deleted", variant: "destructive" };

    case "USER.CREATED":
      return { label: "User Created", variant: "success" };
    case "USER.UPDATED":
      return { label: "User Updated", variant: "info" };
    case "USER.ROLE_UPDATED":
      return { label: "Role Changed", variant: "warning" };
    case "USER.DELETED":
      return { label: "User Deleted", variant: "destructive" };

    case "SETTINGS.HEADER_UPDATED":
      return { label: "Header Saved", variant: "info" };
    case "SETTINGS.FOOTER_UPDATED":
      return { label: "Footer Saved", variant: "info" };

    case "SECURITY.PASSWORD_CHANGED":
      return { label: "Password Changed", variant: "warning" };
    case "AUTH.SESSION_REVOKE":
      return { label: "Session Revoked", variant: "warning" };
    case "AUTH.REVOKE_ALL_SESSIONS":
      return { label: "All Sessions Cleared", variant: "destructive" };

    default: {
      const cleaned = eventType
        .replace(/^(BLOG|PAGE|USER|MEDIA|COMMENT|SETTINGS|SECURITY|AUTH)\./, "")
        .replace(/_/g, " ")
        .toLowerCase();
      return {
        label: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
        variant: "neutral",
      };
    }
  }
}

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live PostgreSQL Audit Log query via API
  const apiUrl = isAdmin
    ? `/api/audit-logs?category=${selectedCategory}&search=${encodeURIComponent(searchQuery)}`
    : null;

  const { data, mutate, isLoading } = useSWR<AuditLogsResponse>(apiUrl, {
    revalidateOnFocus: true,
    dedupingInterval: 2500,
  });

  const logs = useMemo(() => data?.logs || [], [data?.logs]);
  const stats = data?.stats || {
    totalEvents: logs.length,
    blogEvents: 0,
    pageEvents: 0,
    mediaEvents: 0,
    otherEvents: 0,
    retentionDays: 90,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      "Event ID",
      "Timestamp",
      "Category",
      "Event Type",
      "Action",
      "Actor Name",
      "Actor Email",
      "Target",
      "IP Address",
      "Status",
    ];

    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.category,
      l.eventType,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.actor.name}"`,
      l.actor.email,
      `"${l.target.replace(/"/g, '""')}"`,
      l.ipAddress,
      l.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `cms-activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <AdminTopBar
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Activity & Change Log" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                Activity & Change Log
              </h2>
              <Badge
                variant="outline"
                className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
              >
                PostgreSQL Live Stream
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time audit log of all main site changes: blog & page publishing, drafts, trash, permanent deletions, and configuration updates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <RefreshCw
                className={`size-3.5 ${
                  isRefreshing || isLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Admin Access Check */}
        {!isAdmin ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex items-start gap-4">
            <Lock className="size-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                Administrator Permission Required
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Site-wide change logs and administrative audit traces are accessible only to accounts with the <strong className="text-foreground">ADMIN</strong> role.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Activities</span>
                  <Layers className="size-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {stats.totalEvents}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  All recorded site mutations & events
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Blog Articles</span>
                  <BookOpen className="size-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {stats.blogEvents}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Published, drafted, trashed & deleted
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Web Pages</span>
                  <FileText className="size-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {stats.pageEvents}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Page content, status & SEO updates
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Media & Assets</span>
                  <ImageIcon className="size-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {stats.mediaEvents}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cloudinary asset & file changes
                </p>
              </div>
            </div>

            {/* Filters Toolbar */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by action, target, actor, event, or IP address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9.5 text-xs bg-background/50"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
                    <Filter className="size-3" />
                    Filter:
                  </span>
                  {CATEGORY_FILTERS.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          selectedCategory === cat.key
                            ? "bg-foreground text-background font-bold shadow-2xs"
                            : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="size-3" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Activity Log Data Table */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                      <th className="py-3 px-4">Event & Type</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action & Affected Item</th>
                      <th className="py-3 px-4">Client IP</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {isLoading && logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground space-y-2">
                          <Loader2 className="size-6 mx-auto animate-spin text-primary" />
                          <p className="text-xs font-medium">Loading activity records from PostgreSQL...</p>
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground space-y-2">
                          <Layers className="size-8 mx-auto opacity-40 text-muted-foreground" />
                          <p className="text-sm font-semibold">No activity logs recorded yet</p>
                          <p className="text-xs">Publishing, editing, or deleting blogs and pages will immediately appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      logs.map((item) => {
                        const date = new Date(item.timestamp);
                        const badgeInfo = getEventBadgeLabel(item.eventType);
                        const catColor = getCategoryColor(item.category);

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            {/* Event Type & Category Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold py-0.5 px-2 rounded-md ${
                                      badgeInfo.variant === "success"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                        : badgeInfo.variant === "destructive"
                                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                        : badgeInfo.variant === "warning"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                    }`}
                                  >
                                    {badgeInfo.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] uppercase tracking-wider py-0 px-1.5 font-bold rounded-xs ${catColor}`}
                                  >
                                    {item.category}
                                  </Badge>
                                  <span className="font-mono text-[10px] text-muted-foreground/70">
                                    {item.eventType}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Actor Details */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-7 border border-border">
                                  {item.actor.avatar && (
                                    <AvatarImage src={item.actor.avatar} alt={item.actor.name} />
                                  )}
                                  <AvatarFallback className="text-[10px] font-bold">
                                    {item.actor.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground text-xs">
                                    {item.actor.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.actor.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Action & Context */}
                            <td className="py-3.5 px-4 min-w-[260px]">
                              <p className="font-semibold text-foreground text-xs leading-snug">
                                {item.action}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                  <Tag className="size-2.5" />
                                  {item.target}
                                </span>
                              </div>
                            </td>

                            {/* Client IP */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Globe className="size-3 text-muted-foreground/70" />
                                <span>{item.ipAddress}</span>
                              </div>
                            </td>

                            {/* Timestamp */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {formatDistanceToNow(date, { addSuffix: true })}
                                </span>
                                <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                                  <Clock className="size-2.5" />
                                  {format(date, "MMM d, HH:mm:ss")}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {item.status === "SUCCESS" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="size-2.5" />
                                  Success
                                </Badge>
                              )}
                              {item.status === "WARNING" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 border-amber-500/20 inline-flex items-center gap-1"
                                >
                                  <AlertTriangle className="size-2.5" />
                                  Warning
                                </Badge>
                              )}
                              {item.status === "FAILED" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold text-red-600 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"
                                >
                                  Failed
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="py-3 px-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Showing <strong className="text-foreground">{logs.length}</strong> of {stats.totalEvents} database activity entries
                </span>
                <span className="text-[11px] flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" />
                  Live PostgreSQL audit stream • Real-time database telemetry
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
