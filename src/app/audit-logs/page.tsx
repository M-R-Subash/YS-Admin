"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  { key: "PAGES", label: "Pages", icon: FileText },
  { key: "BLOGS", label: "Blogs", icon: BookOpen },
  { key: "MEDIA", label: "Media", icon: ImageIcon },
  { key: "COMMENTS", label: "Comments", icon: MessageSquare },
  { key: "USERS", label: "Users", icon: Users },
  { key: "SETTINGS", label: "Settings", icon: SettingsIcon },
];

interface TransitionInfo {
  from: string;
  to: string;
  type: "publish" | "draft" | "trash" | "restore" | "delete" | "update" | "seo" | "neutral";
  pillText?: string;
}

function getTransitionInfo(item: AuditLogItem): TransitionInfo {
  const meta = item.metadata || {};
  const event = item.eventType;

  // If explicit fromStatus & toStatus were saved in metadata
  if (meta.fromStatus && meta.toStatus) {
    const fromCap = meta.fromStatus.charAt(0).toUpperCase() + meta.fromStatus.slice(1);
    const toCap = meta.toStatus.charAt(0).toUpperCase() + meta.toStatus.slice(1);
    if (meta.toStatus === "published") {
      return { from: fromCap, to: toCap, type: "publish" };
    }
    if (meta.toStatus === "draft") {
      return { from: fromCap, to: toCap, type: "draft" };
    }
    if (meta.toStatus === "trash") {
      return { from: fromCap, to: toCap, type: "trash" };
    }
    return { from: fromCap, to: toCap, type: "update" };
  }

  // Fallbacks based on eventType
  switch (event) {
    case "PAGE.PUBLISHED":
    case "BLOG.PUBLISHED":
      return { from: "Draft", to: "Published", type: "publish" };
    case "PAGE.SET_TO_DRAFT":
    case "BLOG.SET_TO_DRAFT":
      return { from: "Published", to: "Draft", type: "draft" };
    case "PAGE.TRASHED":
    case "BLOG.TRASHED":
      return { from: "Active", to: "Trash", type: "trash" };
    case "PAGE.RESTORED":
    case "BLOG.RESTORED":
      return { from: "Trash", to: "Draft", type: "restore" };
    case "PAGE.PERMANENTLY_DELETED":
    case "BLOG.PERMANENTLY_DELETED":
      return { from: "Trash", to: "Deleted", type: "delete" };
    case "PAGE.SEO_UPDATED":
      return { from: "SEO", to: "Updated", type: "seo", pillText: "SEO Configured" };
    case "PAGE.UPDATED":
    case "BLOG.UPDATED":
      return { from: "Content", to: "Saved", type: "update", pillText: "Content Updated" };
    case "PAGE.BULK_UPDATED":
    case "BLOG.BULK_PUBLISH":
    case "PAGE.BULK_PUBLISH":
      return { from: "Batch", to: "Published", type: "publish" };
    case "BLOG.BULK_DRAFT":
    case "PAGE.BULK_DRAFT":
      return { from: "Batch", to: "Draft", type: "draft" };
    case "BLOG.BULK_TRASH":
    case "PAGE.BULK_TRASH":
      return { from: "Active", to: "Trash", type: "trash" };
    case "BLOG.BULK_RESTORE":
    case "PAGE.BULK_RESTORE":
      return { from: "Trash", to: "Restored", type: "restore" };
    case "BLOG.BULK_DELETEPERMANENT":
    case "PAGE.BULK_DELETEPERMANENT":
      return { from: "Trash", to: "Deleted", type: "delete" };
    case "MEDIA.DELETED":
      return { from: "Cloudinary", to: "Deleted", type: "delete", pillText: "Asset Removed" };
    case "COMMENT.APPROVED":
      return { from: "Pending", to: "Approved", type: "publish" };
    case "COMMENT.UNAPPROVED":
      return { from: "Approved", to: "Hidden", type: "draft" };
    case "COMMENT.TRASHED":
      return { from: "Active", to: "Trash", type: "trash" };
    case "COMMENT.PERMANENTLY_DELETED":
      return { from: "Trash", to: "Deleted", type: "delete" };
    case "USER.CREATED":
      return { from: "New", to: meta.role || "Team", type: "publish" };
    case "USER.ROLE_UPDATED":
      return { from: "Role", to: meta.role || "Updated", type: "update" };
    case "USER.DELETED":
      return { from: "Team", to: "Deleted", type: "delete" };
    case "SETTINGS.HEADER_UPDATED":
      return { from: "Header", to: "Saved", type: "update", pillText: "Header Saved" };
    case "SETTINGS.FOOTER_UPDATED":
      return { from: "Footer", to: "Saved", type: "update", pillText: "Footer Saved" };
    default:
      return { from: "State", to: "Updated", type: "neutral" };
  }
}

function getSimpleExplanation(item: AuditLogItem): string {
  const meta = item.metadata || {};
  const event = item.eventType;

  switch (event) {
    case "PAGE.PUBLISHED":
      return "Page updated from draft to published (now live on website)";
    case "PAGE.SET_TO_DRAFT":
      return "Page changed from published to draft (hidden from public website)";
    case "PAGE.TRASHED":
      return "Moved page to trash (unpublished and staged for deletion)";
    case "PAGE.RESTORED":
      return "Restored page from trash back to drafts";
    case "PAGE.PERMANENTLY_DELETED":
      return "Permanently removed page and its SEO data from database";
    case "PAGE.UPDATED":
      return "Updated page content, sections, and layout";
    case "PAGE.SEO_UPDATED":
      return "Updated SEO meta title, description, and social preview";
    case "PAGE.BULK_UPDATED":
      return `Bulk updated metadata and status across ${meta.count || "multiple"} pages`;

    case "BLOG.PUBLISHED":
      return "Blog article published live to website";
    case "BLOG.CREATED":
      return "Created new blog article draft";
    case "BLOG.SET_TO_DRAFT":
      return "Blog article changed from published to draft";
    case "BLOG.TRASHED":
      return "Moved blog article to trash";
    case "BLOG.RESTORED":
      return "Restored blog article from trash back to drafts";
    case "BLOG.PERMANENTLY_DELETED":
      return "Permanently deleted blog article from database";
    case "BLOG.UPDATED":
      return "Updated blog article content, tags, and excerpt";

    case "MEDIA.DELETED":
      return "Permanently removed image asset from Cloudinary storage";

    case "COMMENT.APPROVED":
      return "Approved reader comment to show publicly under article";
    case "COMMENT.UNAPPROVED":
      return "Unapproved reader comment (hidden from public view)";
    case "COMMENT.TRASHED":
      return "Moved reader comment to trash";
    case "COMMENT.PERMANENTLY_DELETED":
      return "Permanently deleted reader comment from database";

    case "USER.CREATED":
      return `Created new team member account (${meta.role || "Member"})`;
    case "USER.ROLE_UPDATED":
      return `Changed user account role to ${meta.role || "new role"}`;
    case "USER.DELETED":
      return "Deleted user account and reassigned authored content";

    case "SETTINGS.HEADER_UPDATED":
      return "Updated global site header navigation and styling";
    case "SETTINGS.FOOTER_UPDATED":
      return "Updated global site footer branding and link columns";

    case "SECURITY.PASSWORD_CHANGED":
      return "Updated account password and regenerated auth security stamps";
    case "AUTH.SESSION_REVOKE":
      return "Revoked device session token and forced logout";
    case "AUTH.REVOKE_ALL_SESSIONS":
      return "Revoked all active device sessions across the account";

    default:
      return item.action;
  }
}

function getItemCleanName(item: AuditLogItem): { name: string; type: string; slug?: string } {
  const target = item.target || "";
  const meta = item.metadata || {};

  if (target.startsWith("Page: ")) {
    return { name: target.replace(/^Page:\s*/, ""), type: "Page", slug: meta.slug };
  }
  if (target.startsWith("Page SEO: ")) {
    return { name: target.replace(/^Page SEO:\s*/, ""), type: "Page SEO", slug: meta.slug };
  }
  if (target.startsWith("Blog: ")) {
    return { name: target.replace(/^Blog:\s*/, ""), type: "Blog", slug: meta.slug };
  }
  if (target.startsWith("Media: ")) {
    return { name: target.replace(/^Media:\s*/, ""), type: "Media Asset", slug: meta.public_id };
  }
  if (target.startsWith("Comment: ")) {
    return { name: target.replace(/^Comment:\s*/, ""), type: "Comment", slug: meta.blogTitle };
  }
  if (target.startsWith("User: ")) {
    return { name: target.replace(/^User:\s*/, ""), type: "User", slug: meta.email };
  }
  if (target.includes("Header")) {
    return { name: "Global Site Header", type: "Settings" };
  }
  if (target.includes("Footer")) {
    return { name: "Global Site Footer", type: "Settings" };
  }
  return { name: target || "System", type: item.category };
}

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "ADMIN";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      "Event ID",
      "Timestamp",
      "Category",
      "Event Type",
      "Change Summary",
      "Simple Explanation",
      "Target Name",
      "Actor Name",
      "Actor Email",
      "Status",
    ];

    const rows = logs.map((l) => {
      const trans = getTransitionInfo(l);
      const explanation = getSimpleExplanation(l);
      const itemInfo = getItemCleanName(l);
      return [
        l.id,
        l.timestamp,
        l.category,
        l.eventType,
        `"${trans.from} -> ${trans.to}"`,
        `"${explanation.replace(/"/g, '""')}"`,
        `"${itemInfo.name.replace(/"/g, '""')}"`,
        `"${l.actor.name}"`,
        l.actor.email,
        l.status,
      ];
    });

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
    <div className="w-full min-h-screen bg-background p-3 sm:p-5 flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* Top Header Bar (Full-Width Standalone Page Header like Bulk-Edit) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-xl shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          {/* Back Icon Button */}
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer rounded-lg border-border hover:bg-muted"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground">
                  Activity & Change Log
                </h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live PostgreSQL Stream
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Audit trail of all site changes: status transitions, draft vs published, trash, deletions, and edits
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer border-border"
          >
            <RefreshCw
              className={`size-3.5 ${
                isRefreshing || isLoading ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer border-border"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Admin Access Restriction Check */}
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
          {/* Quick Metrics Bar (Clean, Compact, Informative) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Activities</span>
                <div className="text-xl font-black text-foreground tracking-tight mt-0.5">{stats.totalEvents}</div>
              </div>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="size-4" />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Web Pages</span>
                <div className="text-xl font-black text-foreground tracking-tight mt-0.5">{stats.pageEvents}</div>
              </div>
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <FileText className="size-4" />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Blog Articles</span>
                <div className="text-xl font-black text-foreground tracking-tight mt-0.5">{stats.blogEvents}</div>
              </div>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <BookOpen className="size-4" />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Media & Assets</span>
                <div className="text-xl font-black text-foreground tracking-tight mt-0.5">{stats.mediaEvents}</div>
              </div>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <ImageIcon className="size-4" />
              </div>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="p-3 bg-card border border-border rounded-xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            {/* Quick Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by page name, blog title, action, or user..."
                className="h-8 pl-8 pr-7 text-xs bg-muted/40 border-border rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1.5 flex items-center gap-1 shrink-0">
                <Filter className="size-3" />
                Filter:
              </span>
              {CATEGORY_FILTERS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-foreground text-background font-bold shadow-2xs"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full-Page Interactive Change Log Grid */}
          <div className="flex-1 rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider font-bold text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-3 px-4 w-[240px]">Affected Item</th>
                    <th className="py-3 px-4 w-[200px]">What Changed (Before ➔ After)</th>
                    <th className="py-3 px-4 min-w-[300px]">Simple Explanation</th>
                    <th className="py-3 px-4 w-[180px]">Changed By</th>
                    <th className="py-3 px-4 w-[160px]">When</th>
                    <th className="py-3 px-4 w-[70px] text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground space-y-2">
                        <Loader2 className="size-6 mx-auto animate-spin text-primary" />
                        <p className="text-xs font-medium">Loading live change history from PostgreSQL...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground space-y-2">
                        <Layers className="size-8 mx-auto opacity-40 text-muted-foreground" />
                        <p className="text-sm font-semibold">No changes recorded matching your filter</p>
                        <p className="text-xs">Publishing, editing, or deleting pages and blogs will automatically record here.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((item) => {
                      const date = new Date(item.timestamp);
                      const trans = getTransitionInfo(item);
                      const explanation = getSimpleExplanation(item);
                      const itemInfo = getItemCleanName(item);
                      const isExpanded = expandedRowId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-muted/30 transition-colors group cursor-pointer ${
                            isExpanded ? "bg-muted/20" : ""
                          }`}
                          onClick={() => toggleRow(item.id)}
                        >
                          {/* 1. Affected Item */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground text-xs leading-tight">
                                  {itemInfo.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] uppercase tracking-wider py-0 px-1.5 font-bold rounded-xs bg-muted/80 text-muted-foreground border-border"
                                >
                                  {itemInfo.type}
                                </Badge>
                                {itemInfo.slug && (
                                  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">
                                    /{itemInfo.slug.replace(/^\//, "")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. What Changed (Before ➔ After) */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            {trans.pillText ? (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-bold py-1 px-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              >
                                {trans.pillText}
                              </Badge>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 p-1 px-2 rounded-lg bg-muted/60 border border-border">
                                <span
                                  className={`text-[11px] font-semibold ${
                                    trans.from.toLowerCase() === "published"
                                      ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                      : trans.from.toLowerCase() === "trash"
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {trans.from}
                                </span>
                                <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                                <span
                                  className={`text-[11px] font-bold ${
                                    trans.to.toLowerCase() === "published"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : trans.to.toLowerCase() === "trash"
                                      ? "text-amber-600 dark:text-amber-400"
                                      : trans.to.toLowerCase() === "deleted"
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-foreground"
                                  }`}
                                >
                                  {trans.to}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 3. Simple Explanation */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex flex-col gap-1">
                              <p className="font-medium text-foreground text-xs leading-relaxed">
                                {explanation}
                              </p>
                              {/* If row is expanded, show detailed audit metadata inline */}
                              {isExpanded && (
                                <div className="mt-2 p-2.5 rounded-lg bg-background border border-border space-y-1.5 text-[11px] font-mono animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1">
                                    <span>Technical Event ID: {item.id}</span>
                                    <span>Event Type: {item.eventType}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                                    <div>Client IP: <strong className="text-foreground">{item.ipAddress}</strong></div>
                                    <div>Status: <strong className="text-emerald-600">{item.status}</strong></div>
                                  </div>
                                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                                    <div className="pt-1">
                                      <span className="text-muted-foreground">Payload Metadata:</span>
                                      <pre className="text-[10px] bg-muted/40 p-1.5 rounded mt-0.5 overflow-x-auto text-foreground">
                                        {JSON.stringify(item.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. Changed By (Actor) */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <div className="flex items-center gap-2">
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
                                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                  {item.actor.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 5. When */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap text-muted-foreground text-[11px]">
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

                          {/* 6. Expand Action Toggle */}
                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(item.id);
                              }}
                              title={isExpanded ? "Collapse details" : "Expand details"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="py-2.5 px-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground shrink-0">
              <span>
                Showing <strong className="text-foreground">{logs.length}</strong> of {stats.totalEvents} recorded database modifications
              </span>
              <span className="text-[11px] flex items-center gap-1 font-mono">
                <Sparkles className="size-3 text-primary" />
                Immutable PostgreSQL audit log telemetry
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
