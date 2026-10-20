"use client";

import React, { useState, useMemo, useCallback, useRef, useDeferredValue } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  FileText,
  RefreshCw,
  Clock,
  Lock,
  Layers,
  Sparkles,
  Loader2,
  BookOpen,
  Image as ImageIcon,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  ArrowRight,
  ArrowRightLeft,
  Hash,
  Mail,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  X,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ExportColumnsModal, ExportColumnOption } from "@/components/spreadsheet/ExportColumnsModal";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

export type AuditCategory =
  | "BLOGS"
  | "PAGES"
  | "MEDIA"
  | "COMMENTS"
  | "USERS"
  | "SETTINGS"
  | "REDIRECTIONS"
  | "NEWSLETTERS"
  | "TAXONOMY"
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
    role: string;
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
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    totalEvents: number;
    matchingEvents?: number;
    blogEvents: number;
    pageEvents: number;
    mediaEvents: number;
    redirectEvents?: number;
    taxonomyEvents?: number;
    newsletterEvents?: number;
    otherEvents: number;
    retentionDays: number;
  };
}

const CATEGORY_OPTIONS: { key: string; label: string; icon: any }[] = [
  { key: "PAGES", label: "Pages", icon: FileText },
  { key: "BLOGS", label: "Blogs", icon: BookOpen },
  { key: "REDIRECTIONS", label: "Redirections", icon: ArrowRightLeft },
  { key: "TAXONOMY", label: "Taxonomy", icon: Hash },
  { key: "NEWSLETTERS", label: "Newsletters", icon: Mail },
  { key: "MEDIA", label: "Media Assets", icon: ImageIcon },
  { key: "COMMENTS", label: "Comments", icon: MessageSquare },
  { key: "USERS", label: "Team Members", icon: Users },
  { key: "SETTINGS", label: "Settings", icon: SettingsIcon },
];

const AUDIT_EXPORT_COLUMNS: ExportColumnOption[] = [
  { key: "timestamp", label: "Timestamp", category: "Audit Info" },
  { key: "category", label: "Category", category: "Audit Info" },
  { key: "eventType", label: "Event Type", category: "Audit Info" },
  { key: "itemName", label: "Affected Item", category: "Resource" },
  { key: "itemType", label: "Resource Type", category: "Resource" },
  { key: "itemSlug", label: "Slug / Path", category: "Resource" },
  { key: "transition", label: "Status Transition", category: "Change" },
  { key: "explanation", label: "Activity Summary", category: "Change" },
  { key: "actorName", label: "Modified By (Name)", category: "Team Member" },
  { key: "actorEmail", label: "Modified By (Email)", category: "Team Member" },
  { key: "actorRole", label: "User Role", category: "Team Member" },
  { key: "status", label: "Execution Status", category: "Audit Info" },
  { key: "id", label: "Audit ID", category: "System" },
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

  // 1. Only report a state transition if fromStatus and toStatus actually DIFFER!
  // If fromStatus === toStatus (e.g. published === published), it is a content/attribute update, NOT a status transition.
  if (
    meta.fromStatus &&
    meta.toStatus &&
    meta.fromStatus.toLowerCase() !== meta.toStatus.toLowerCase()
  ) {
    const fromCap = meta.fromStatus.charAt(0).toUpperCase() + meta.fromStatus.slice(1);
    const toCap = meta.toStatus.charAt(0).toUpperCase() + meta.toStatus.slice(1);
    if (meta.toStatus === "published" || meta.toStatus === "active") {
      return { from: fromCap, to: toCap, type: "publish" };
    }
    if (meta.toStatus === "draft" || meta.toStatus === "inactive" || meta.toStatus === "unsubscribed") {
      return { from: fromCap, to: toCap, type: "draft" };
    }
    if (meta.toStatus === "trash" || meta.toStatus === "trashed") {
      return { from: fromCap, to: toCap, type: "trash" };
    }
    if (meta.toStatus === "deleted") {
      return { from: fromCap, to: toCap, type: "delete" };
    }
    return { from: fromCap, to: toCap, type: "update" };
  }

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
    case "BLOG.SEO_UPDATED":
      return { from: "SEO", to: "Updated", type: "seo", pillText: "SEO Configured" };
    case "PAGE.UPDATED":
    case "BLOG.UPDATED":
      if (meta.fromTitle && meta.toTitle && meta.fromTitle !== meta.toTitle) {
        return { from: "Title", to: "Renamed", type: "update", pillText: "Title Renamed" };
      }
      if (meta.contentChanged) {
        return { from: "Body", to: "Updated", type: "update", pillText: "Content Updated" };
      }
      if (meta.changedFields && Array.isArray(meta.changedFields) && meta.changedFields.length > 0) {
        if (meta.changedFields.length === 1) {
          const field = meta.changedFields[0];
          const label = meta.diff?.[field]?.label || field;
          return { from: label, to: "Updated", type: "update", pillText: `${label} Updated` };
        }
        return { from: "Fields", to: `${meta.changedFields.length} Updated`, type: "update", pillText: `${meta.changedFields.length} Fields Updated` };
      }
      return { from: "Content", to: "Saved", type: "update", pillText: "Content Updated" };

    case "PAGE.BULK_PUBLISH":
    case "BLOG.BULK_PUBLISH":
      return { from: "Batch", to: "Published", type: "publish" };
    case "PAGE.BULK_DRAFT":
    case "BLOG.BULK_DRAFT":
      return { from: "Batch", to: "Draft", type: "draft" };
    case "PAGE.BULK_TRASH":
    case "BLOG.BULK_TRASH":
      return { from: "Active", to: "Trash", type: "trash" };
    case "PAGE.BULK_RESTORE":
    case "BLOG.BULK_RESTORE":
      return { from: "Trash", to: "Restored", type: "restore" };
    case "PAGE.BULK_DELETEPERMANENT":
    case "BLOG.BULK_DELETEPERMANENT":
      return { from: "Trash", to: "Deleted", type: "delete" };

    case "REDIRECTION.CREATED":
      return { from: "New", to: "Active", type: "publish", pillText: `${meta.statusCode || 301} Redirect Added` };
    case "REDIRECTION.STATUS_CHANGED":
      return { from: meta.fromStatus || "Active", to: meta.toStatus || "Inactive", type: meta.toStatus === "active" ? "publish" : "draft" };
    case "REDIRECTION.TRASHED":
      return { from: "Active", to: "Trash", type: "trash" };
    case "REDIRECTION.DELETED":
      return { from: "Trash", to: "Deleted", type: "delete" };
    case "REDIRECTION.UPDATED":
      return { from: "Redirect", to: "Updated", type: "update", pillText: "Redirect Updated" };

    case "TAXONOMY.CATEGORY_CREATED":
      return { from: "New", to: "Created", type: "publish", pillText: "Category Added" };
    case "TAXONOMY.CATEGORY_UPDATED":
      return { from: "Category", to: "Updated", type: "update", pillText: "Category Updated" };
    case "TAXONOMY.CATEGORY_DELETED":
      return { from: "Active", to: "Deleted", type: "delete" };

    case "TAXONOMY.TAG_CREATED":
      return { from: "New", to: "Created", type: "publish", pillText: "Tag Added" };
    case "TAXONOMY.TAG_UPDATED":
      return { from: "Tag", to: "Updated", type: "update", pillText: "Tag Updated" };
    case "TAXONOMY.TAG_DELETED":
      return { from: "Active", to: "Deleted", type: "delete" };

    case "NEWSLETTERS.CAMPAIGN_SCHEDULED":
      return { from: "Draft", to: "Scheduled", type: "publish", pillText: "Campaign Scheduled" };
    case "NEWSLETTERS.CAMPAIGN_DISPATCHED":
      return { from: "Draft", to: "Dispatched", type: "publish", pillText: "Blast Dispatched" };
    case "NEWSLETTERS.SUBSCRIBER_ADDED":
      return { from: "New", to: "Subscribed", type: "publish", pillText: "Subscriber Added" };
    case "NEWSLETTERS.SUBSCRIBER_STATUS_CHANGED":
      return { from: meta.fromStatus || "Active", to: meta.toStatus || "Unsubscribed", type: meta.toStatus === "active" ? "publish" : "draft" };
    case "NEWSLETTERS.SUBSCRIBER_DELETED":
      return { from: "Active", to: "Deleted", type: "delete" };

    case "MEDIA.DELETED":
      return { from: "Storage", to: "Deleted", type: "delete", pillText: "Asset Removed" };

    case "COMMENT.APPROVED":
      return { from: "Pending", to: "Approved", type: "publish" };
    case "COMMENT.UNAPPROVED":
      return { from: "Approved", to: "Hidden", type: "draft" };
    case "COMMENT.TRASHED":
      return { from: "Active", to: "Trash", type: "trash" };
    case "COMMENT.PERMANENTLY_DELETED":
      return { from: "Trash", to: "Deleted", type: "delete" };

    case "USER.CREATED":
      return { from: "Invited", to: meta.role || "Member", type: "publish" };
    case "USER.PASSWORD_CHANGED":
      return { from: "Password", to: "Changed", type: "update", pillText: "Password Changed" };
    case "USER.ROLE_UPDATED":
      return { from: "Role", to: meta.role || "Updated", type: "update" };
    case "USER.UPDATED":
      if (meta.changedFields && Array.isArray(meta.changedFields) && meta.changedFields.length > 0) {
        if (meta.changedFields.length === 1) {
          const field = meta.changedFields[0];
          const label = meta.diff?.[field]?.label || field;
          return { from: label, to: "Updated", type: "update", pillText: `${label} Updated` };
        }
        return { from: "Profile", to: `${meta.changedFields.length} Updated`, type: "update", pillText: `${meta.changedFields.length} Fields Updated` };
      }
      return { from: "Profile", to: "Updated", type: "update", pillText: "Profile Updated" };
    case "USER.DELETED":
      return { from: "Team", to: "Removed", type: "delete" };

    case "SETTINGS.HEADER_UPDATED":
      return { from: "Header", to: "Saved", type: "update", pillText: "Header Saved" };
    case "SETTINGS.FOOTER_UPDATED":
      return { from: "Footer", to: "Saved", type: "update", pillText: "Footer Saved" };

    default:
      return { from: "State", to: "Updated", type: "neutral" };
  }
}

// Crisp, concise explanations without redundant wall-of-text
function getSimpleExplanation(item: AuditLogItem): string {
  if (item.action && item.action.trim()) {
    return item.action;
  }
  const meta = item.metadata || {};
  const event = item.eventType;

  switch (event) {
    case "PAGE.PUBLISHED":
      return "Published page live";
    case "PAGE.SET_TO_DRAFT":
      return "Reverted page to draft";
    case "PAGE.TRASHED":
      return "Moved page to trash";
    case "PAGE.RESTORED":
      return "Restored page to draft";
    case "PAGE.PERMANENTLY_DELETED":
      return "Permanently deleted page";
    case "PAGE.UPDATED":
      if (meta.fromTitle && meta.toTitle && meta.fromTitle !== meta.toTitle) {
        return `Renamed page from "${meta.fromTitle}" to "${meta.toTitle}"`;
      }
      return "Updated page content & layout";
    case "PAGE.SEO_UPDATED":
      return "Updated SEO metadata";
    case "PAGE.BULK_PUBLISH":
      return `Bulk published ${meta.targetIds?.length || ""} pages`;
    case "PAGE.BULK_DRAFT":
      return `Bulk drafted ${meta.targetIds?.length || ""} pages`;
    case "PAGE.BULK_TRASH":
      return `Bulk trashed ${meta.targetIds?.length || ""} pages`;
    case "PAGE.BULK_RESTORE":
      return `Bulk restored ${meta.targetIds?.length || ""} pages`;
    case "PAGE.BULK_DELETEPERMANENT":
      return `Bulk deleted ${meta.targetIds?.length || ""} pages`;

    case "BLOG.PUBLISHED":
      return "Published blog article";
    case "BLOG.CREATED":
      return "Created article draft";
    case "BLOG.SET_TO_DRAFT":
      return "Reverted article to draft";
    case "BLOG.TRASHED":
      return "Moved article to trash";
    case "BLOG.RESTORED":
      return "Restored article to draft";
    case "BLOG.PERMANENTLY_DELETED":
      return "Permanently deleted article";
    case "BLOG.UPDATED":
      if (meta.fromTitle && meta.toTitle && meta.fromTitle !== meta.toTitle) {
        return `Renamed article from "${meta.fromTitle}" to "${meta.toTitle}"`;
      }
      return "Updated article content";
    case "BLOG.SEO_UPDATED":
      return "Updated SEO metadata";
    case "BLOG.BULK_PUBLISH":
      return `Bulk published ${meta.targetIds?.length || ""} articles`;
    case "BLOG.BULK_DRAFT":
      return `Bulk drafted ${meta.targetIds?.length || ""} articles`;
    case "BLOG.BULK_TRASH":
      return `Bulk trashed ${meta.targetIds?.length || ""} articles`;
    case "BLOG.BULK_RESTORE":
      return `Bulk restored ${meta.targetIds?.length || ""} articles`;
    case "BLOG.BULK_DELETEPERMANENT":
      return `Bulk deleted ${meta.targetIds?.length || ""} articles`;

    case "REDIRECTION.CREATED":
      return `Created ${meta.statusCode || 301} URL redirect`;
    case "REDIRECTION.STATUS_CHANGED":
      return `Changed redirect status to ${meta.toStatus || "updated"}`;
    case "REDIRECTION.TRASHED":
      return "Moved URL redirect to trash";
    case "REDIRECTION.DELETED":
      return "Permanently deleted redirect";
    case "REDIRECTION.UPDATED":
      return "Updated redirect destination";

    case "TAXONOMY.CATEGORY_CREATED":
      return "Created new blog category";
    case "TAXONOMY.CATEGORY_UPDATED":
      return "Updated category details";
    case "TAXONOMY.CATEGORY_DELETED":
      return "Permanently deleted category";
    case "TAXONOMY.TAG_CREATED":
      return "Created new tag";
    case "TAXONOMY.TAG_UPDATED":
      return "Updated tag details";
    case "TAXONOMY.TAG_DELETED":
      return "Permanently deleted tag";

    case "NEWSLETTERS.CAMPAIGN_SCHEDULED":
      return "Scheduled newsletter campaign";
    case "NEWSLETTERS.CAMPAIGN_DISPATCHED":
      return "Dispatched newsletter blast";
    case "NEWSLETTERS.SUBSCRIBER_ADDED":
      return "Added newsletter subscriber";
    case "NEWSLETTERS.SUBSCRIBER_STATUS_CHANGED":
      return `Updated subscriber status to ${meta.toStatus || ""}`;
    case "NEWSLETTERS.SUBSCRIBER_DELETED":
      return "Deleted subscriber from list";

    case "MEDIA.DELETED":
      return "Deleted media asset";

    case "COMMENT.APPROVED":
      return "Approved reader comment";
    case "COMMENT.UNAPPROVED":
      return "Unapproved reader comment";
    case "COMMENT.TRASHED":
      return "Moved comment to trash";
    case "COMMENT.PERMANENTLY_DELETED":
      return "Permanently deleted comment";

    case "USER.CREATED":
      return "Created team member account";
    case "USER.ROLE_UPDATED":
      return `Changed role to ${meta.role || "updated"}`;
    case "USER.DELETED":
      return "Removed team member account";

    case "SETTINGS.HEADER_UPDATED":
      return "Saved header settings";
    case "SETTINGS.FOOTER_UPDATED":
      return "Saved footer settings";

    default:
      return item.action;
  }
}

function getItemCleanName(item: AuditLogItem): {
  name: string;
  type: string;
  slug?: string;
  cmsUrl?: string;
} {
  const target = item.target || "";
  const meta = item.metadata || {};

  if (target.startsWith("Page: ")) {
    return {
      name: target.replace(/^Page:\s*/, ""),
      type: "Page",
      slug: meta.slug,
      cmsUrl: "/webpages",
    };
  }
  if (target.startsWith("Page SEO: ")) {
    return {
      name: target.replace(/^Page SEO:\s*/, ""),
      type: "Page SEO",
      slug: meta.slug,
      cmsUrl: "/webpages",
    };
  }
  if (target.startsWith("Blog: ")) {
    return {
      name: target.replace(/^Blog:\s*/, ""),
      type: "Blog",
      slug: meta.slug,
      cmsUrl: "/blogs",
    };
  }
  if (target.startsWith("Redirect: ")) {
    return {
      name: target.replace(/^Redirect:\s*/, ""),
      type: "Redirection",
      slug: meta.destinationUrl,
      cmsUrl: "/redirections",
    };
  }
  if (target.startsWith("Category: ")) {
    return {
      name: target.replace(/^Category:\s*/, ""),
      type: "Category",
      slug: meta.slug,
      cmsUrl: "/categories",
    };
  }
  if (target.startsWith("Tag: ")) {
    return {
      name: target.replace(/^Tag:\s*/, ""),
      type: "Tag",
      slug: meta.slug,
      cmsUrl: "/tags",
    };
  }
  if (target.startsWith("Campaign: ")) {
    return {
      name: target.replace(/^Campaign:\s*/, ""),
      type: "Campaign",
      cmsUrl: "/newsletters",
    };
  }
  if (target.startsWith("Subscriber: ")) {
    return {
      name: target.replace(/^Subscriber:\s*/, ""),
      type: "Subscriber",
      slug: meta.email,
      cmsUrl: "/newsletters",
    };
  }
  if (target.startsWith("Media: ")) {
    return {
      name: target.replace(/^Media:\s*/, ""),
      type: "Media Asset",
      slug: meta.public_id,
      cmsUrl: "/media",
    };
  }
  if (target.startsWith("Comment: ")) {
    return {
      name: target.replace(/^Comment:\s*/, ""),
      type: "Comment",
      slug: meta.blogTitle,
      cmsUrl: "/comments",
    };
  }
  if (target.startsWith("User: ")) {
    return {
      name: target.replace(/^User:\s*/, ""),
      type: "User",
      slug: meta.email,
      cmsUrl: "/users",
    };
  }
  if (target.includes("Header")) {
    return {
      name: "Global Site Header",
      type: "Settings",
      cmsUrl: "/header",
    };
  }
  if (target.includes("Footer")) {
    return {
      name: "Global Site Footer",
      type: "Settings",
      cmsUrl: "/footer",
    };
  }
  return { name: target || "System", type: item.category };
}

function getCategoryIcon(category: AuditCategory) {
  switch (category) {
    case "PAGES":
      return FileText;
    case "BLOGS":
      return BookOpen;
    case "REDIRECTIONS":
      return ArrowRightLeft;
    case "TAXONOMY":
      return Hash;
    case "NEWSLETTERS":
      return Mail;
    case "MEDIA":
      return ImageIcon;
    case "COMMENTS":
      return MessageSquare;
    case "USERS":
      return Users;
    case "SETTINGS":
      return SettingsIcon;
    default:
      return Layers;
  }
}

interface AuditLogRowProps {
  item: AuditLogItem;
  onSelect: (item: AuditLogItem) => void;
}

const AuditLogRow = React.memo(function AuditLogRow({ item, onSelect }: AuditLogRowProps) {
  const date = useMemo(() => new Date(item.timestamp), [item.timestamp]);
  const trans = useMemo(() => getTransitionInfo(item), [item]);
  const explanation = useMemo(() => getSimpleExplanation(item), [item]);
  const itemInfo = useMemo(() => getItemCleanName(item), [item]);
  const Icon = useMemo(() => getCategoryIcon(item.category), [item.category]);
  const relativeTime = useMemo(() => formatDistanceToNow(date, { addSuffix: true }), [date]);
  const exactTime = useMemo(() => format(date, "HH:mm:ss"), [date]);

  return (
    <tr
      onClick={() => onSelect(item)}
      className="hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30 last:border-b-0"
    >
      {/* 1. Affected Item */}
      <td className="py-3 px-4 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground border border-border">
            <Icon className="size-3.5" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-bold text-foreground text-xs leading-tight truncate" title={itemInfo.name}>
              {itemInfo.name}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[9px] uppercase tracking-wider py-0 px-1 font-bold rounded-xs bg-muted/80 text-muted-foreground border-border shrink-0"
              >
                {itemInfo.type}
              </Badge>
              {itemInfo.slug && (
                <span className="font-mono text-[10px] text-muted-foreground truncate">
                  /{itemInfo.slug.replace(/^\//, "")}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 2. What Changed (Before ➔ After State Transition Chip) */}
      <td className="py-3 px-4 align-middle whitespace-nowrap">
        {trans.pillText ? (
          <Badge
            variant="outline"
            className="text-[11px] font-bold py-1 px-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
          >
            {trans.pillText}
          </Badge>
        ) : (
          <div className="inline-flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-muted/60 border border-border">
            <span
              className={`text-[11px] font-semibold ${
                trans.from.toLowerCase() === "published" || trans.from.toLowerCase() === "active"
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : trans.from.toLowerCase() === "trash" || trans.from.toLowerCase() === "trashed"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {trans.from}
            </span>
            <ArrowRight className="size-3 text-muted-foreground shrink-0" />
            <span
              className={`text-[11px] font-bold ${
                trans.to.toLowerCase() === "published" || trans.to.toLowerCase() === "active"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : trans.to.toLowerCase() === "trash" || trans.to.toLowerCase() === "trashed"
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

      {/* 3. Simple Activity Explanation (Clean & Short) */}
      <td className="py-3 px-4 align-middle">
        <p className="font-medium text-foreground text-xs leading-relaxed truncate" title={explanation}>
          {explanation}
        </p>
      </td>

      {/* 4. Changed By (Actor) */}
      <td className="py-3 px-4 align-middle whitespace-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="size-7 border border-border shrink-0">
            {item.actor.avatar && (
              <AvatarImage src={item.actor.avatar} alt={item.actor.name} />
            )}
            <AvatarFallback className="text-[10px] font-bold">
              {item.actor.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground text-xs truncate">
              {item.actor.name}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {item.actor.email}
            </span>
          </div>
        </div>
      </td>

      {/* 5. When */}
      <td className="py-3 px-4 align-middle whitespace-nowrap text-right text-muted-foreground text-[11px]">
        <div className="flex flex-col items-end">
          <span className="font-medium text-foreground">
            {relativeTime}
          </span>
          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
            <Clock className="size-2.5" />
            {exactTime}
          </span>
        </div>
      </td>
    </tr>
  );
});

function formatDiffValue(val: any): string {
  if (val === null || val === undefined || val === "") return "(empty)";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) {
    return val.length === 0 ? "(none)" : val.join(", ");
  }
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

interface AuditLogInspectorProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

function AuditLogInspector({ log }: AuditLogInspectorProps) {
  const [copiedId, setCopiedId] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  if (!log) return null;

  const copyLogId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(false), 2000);
  };

  const date = new Date(log.timestamp);
  const trans = getTransitionInfo(log);
  const explanation = getSimpleExplanation(log);
  const itemInfo = getItemCleanName(log);
  const meta = log.metadata || {};

  return (
    <>
      <SheetHeader className="p-5 border-b border-border/60 bg-muted/20">
        <div className="flex items-start justify-between gap-3 pr-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 bg-primary/10 text-primary border-primary/20"
              >
                {log.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(date, "MMM d, yyyy · HH:mm:ss")}
              </span>
            </div>
            <SheetTitle className="text-base font-bold text-foreground leading-snug">
              {explanation}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {formatDistanceToNow(date, { addSuffix: true })} by {log.actor.name}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* 1. Target Resource Card */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Target Resource
            </span>
            {itemInfo.cmsUrl && (
              <Link href={itemInfo.cmsUrl} target="_blank">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] font-semibold gap-1 text-primary hover:text-primary cursor-pointer p-1"
                >
                  <span>Open in Admin</span>
                  <ExternalLink className="size-3" />
                </Button>
              </Link>
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {itemInfo.name}
            </h4>
            {itemInfo.slug && (
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                /{itemInfo.slug.replace(/^\//, "")}
              </p>
            )}
          </div>
        </div>

        {/* 2. Before ➔ After Status Box (Only if status actually changed) */}
        {trans.from.toLowerCase() !== trans.to.toLowerCase() ? (
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Status Transition
            </span>
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/80">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Previous State
                </span>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  {trans.from}
                </span>
              </div>
              <ArrowRight className="size-4 text-primary shrink-0" />
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  New State
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {trans.to}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Modification Type
            </span>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/80">
              <span className="text-xs font-bold text-foreground">
                {trans.pillText || "Content & Field Update"}
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                {meta.toStatus ? meta.toStatus.charAt(0).toUpperCase() + meta.toStatus.slice(1) : "Published"}
              </Badge>
            </div>
          </div>
        )}

        {/* 3. Team Member (Actor) Card */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Modified By
          </span>
          <div className="flex items-center gap-3">
            <Avatar className="size-9 border border-border">
              {log.actor.avatar && (
                <AvatarImage src={log.actor.avatar} alt={log.actor.name} />
              )}
              <AvatarFallback className="text-xs font-bold">
                {log.actor.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-foreground">
                  {log.actor.name}
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-semibold px-1 py-0 rounded-xs bg-muted text-muted-foreground border-border"
                >
                  {log.actor.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {log.actor.email}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Field Modifications Card (Diff Breakdown) */}
        {meta.diff && Object.keys(meta.diff).length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Field Modifications ({Object.keys(meta.diff).length})
              </span>
              {meta.contentChanged && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                >
                  Body Content Updated
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {Object.values(meta.diff).map((entry: any, idx: number) => {
                const fromStr = formatDiffValue(entry.from);
                const toStr = formatDiffValue(entry.to);
                const isImage =
                  (entry.field === "featuredImage" ||
                    entry.field === "ogImage" ||
                    entry.field === "profilePicture") &&
                  (entry.to || entry.from);

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-muted/40 border border-border/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {entry.label || entry.field}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {entry.field}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-background/60 border border-border/50">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">
                          Previous
                        </span>
                        {isImage &&
                        entry.from &&
                        typeof entry.from === "string" &&
                        entry.from.startsWith("http") ? (
                          <div className="space-y-1">
                            <img
                              src={entry.from}
                              alt="Previous"
                              className="h-10 w-auto rounded object-cover border border-border opacity-60"
                            />
                            <span className="text-muted-foreground line-through break-all text-[10px] font-mono block truncate">
                              {fromStr}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground line-through break-all text-[11px] block">
                            {fromStr}
                          </span>
                        )}
                      </div>

                      <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                          Updated
                        </span>
                        {isImage &&
                        entry.to &&
                        typeof entry.to === "string" &&
                        entry.to.startsWith("http") ? (
                          <div className="space-y-1">
                            <img
                              src={entry.to}
                              alt="New"
                              className="h-10 w-auto rounded object-cover border border-emerald-500/30"
                            />
                            <span className="text-foreground font-semibold break-all text-[10px] font-mono block truncate">
                              {toStr}
                            </span>
                          </div>
                        ) : (
                          <span className="text-foreground font-semibold break-all text-[11px] block">
                            {toStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Activity Specific Breakdown (Clean checklist, NOT raw JSON) */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Change Details
          </span>
          <div className="space-y-1.5 text-xs text-foreground">
            {meta.fromTitle && meta.toTitle && meta.fromTitle !== meta.toTitle && (
              <>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Previous Title:</span>
                  <span className="font-medium text-muted-foreground line-through">{meta.fromTitle}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">New Title:</span>
                  <span className="font-bold text-foreground">{meta.toTitle}</span>
                </div>
              </>
            )}
            {meta.fromSlug && meta.toSlug && meta.fromSlug !== meta.toSlug && (
              <>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Previous Slug:</span>
                  <span className="font-mono text-[11px] text-muted-foreground line-through">/{meta.fromSlug}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">New Slug:</span>
                  <span className="font-mono text-[11px] font-bold text-foreground">/{meta.toSlug}</span>
                </div>
              </>
            )}
            {meta.sourceUrl && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Source URL:</span>
                <span className="font-mono text-[11px] font-medium">{meta.sourceUrl}</span>
              </div>
            )}
            {meta.destinationUrl && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Destination:</span>
                <span className="font-mono text-[11px] font-medium">{meta.destinationUrl}</span>
              </div>
            )}
            {meta.statusCode && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">HTTP Status:</span>
                <span className="font-semibold">{meta.statusCode} Redirect</span>
              </div>
            )}
            {meta.subject && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Subject Line:</span>
                <span className="font-medium text-right">{meta.subject}</span>
              </div>
            )}
            {meta.totalRecipients !== undefined && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Recipients:</span>
                <span className="font-semibold">{meta.totalRecipients} subscribers</span>
              </div>
            )}
            {meta.scheduledAt && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Scheduled Send:</span>
                <span>{format(new Date(meta.scheduledAt), "MMM d, yyyy HH:mm")}</span>
              </div>
            )}
            {meta.targetIds && Array.isArray(meta.targetIds) && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Batch Count:</span>
                <span className="font-semibold">{meta.targetIds.length} items modified</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Execution Status:</span>
              {log.status === "SUCCESS" ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Success
                </span>
              ) : log.status === "WARNING" ? (
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  Warning
                </span>
              ) : (
                <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <XCircle className="size-3" />
                  Failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 5. System Integrity Stamp */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono truncate max-w-[240px]">
            ID: {log.id}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyLogId(log.id)}
            className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
          >
            {copiedId ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>Copy ID</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Search input state: instant local state for 60fps typing, deferred for non-blocking local filtering, debounced for server API
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [page, setPage] = useState(1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedActor, setSelectedActor] = useState<string>("ALL");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const selectedCategoryParam =
    selectedCategories.size === 1 ? Array.from(selectedCategories)[0] : null;

  // Live PostgreSQL Audit Log query via SWR with debounced search, category filter, and pagination
  const apiUrl = isAdmin
    ? `/api/audit-logs?limit=${pageSize}&offset=${offset}${
        debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""
      }${selectedCategoryParam ? `&category=${encodeURIComponent(selectedCategoryParam)}` : ""}`
    : null;

  // Dedicated uncached fetcher for real-time audit logs
  const auditFetcher = useCallback(async (url: string) => {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch audit logs");
    }
    return res.json();
  }, []);

  const { data, mutate, isLoading, isValidating } = useSWR<AuditLogsResponse>(
    apiUrl,
    auditFetcher,
    {
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
      refreshInterval: 0, // No background polling; revalidates instantly on mount, window focus, or manual refresh
    }
  );

  // Force instant revalidation whenever user navigates to this page
  React.useEffect(() => {
    mutate();
  }, [mutate]);

  const rawLogs = useMemo(() => data?.logs || [], [data?.logs]);
  const totalItems = data?.pagination?.total ?? data?.total ?? rawLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const stats = data?.stats || {
    totalEvents: rawLogs.length,
    blogEvents: 0,
    pageEvents: 0,
    mediaEvents: 0,
    redirectEvents: 0,
    taxonomyEvents: 0,
    newsletterEvents: 0,
    otherEvents: 0,
    retentionDays: 90,
  };

  // Distinct actors for quick filter
  const uniqueActors = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of rawLogs) {
      if (l.actor?.email) {
        map.set(l.actor.email, l.actor.name);
      }
    }
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [rawLogs]);

  // Client-side multi-filtering with deferredSearch for instant, non-blocking response
  const filteredLogs = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();

    return rawLogs.filter((item) => {
      // 1. Instant local search matching across all pertinent item properties
      if (query) {
        const itemInfo = getItemCleanName(item);
        const explanation = getSimpleExplanation(item);
        const matches =
          itemInfo.name.toLowerCase().includes(query) ||
          Boolean(itemInfo.slug && itemInfo.slug.toLowerCase().includes(query)) ||
          explanation.toLowerCase().includes(query) ||
          item.actor.name.toLowerCase().includes(query) ||
          item.actor.email.toLowerCase().includes(query) ||
          item.target.toLowerCase().includes(query) ||
          item.eventType.toLowerCase().includes(query);
        if (!matches) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategories.size > 0 && !selectedCategories.has(item.category)) {
        return false;
      }

      // 3. Actor filter
      if (selectedActor !== "ALL" && item.actor.email !== selectedActor) {
        return false;
      }

      // 4. State transition filter
      if (selectedActionFilter !== "ALL") {
        const trans = getTransitionInfo(item);
        if (selectedActionFilter === "published") {
          return trans.to.toLowerCase() === "published" || trans.to.toLowerCase() === "active";
        }
        if (selectedActionFilter === "draft") {
          return trans.to.toLowerCase() === "draft" || trans.to.toLowerCase() === "inactive";
        }
        if (selectedActionFilter === "trashed") {
          return trans.to.toLowerCase() === "trash" || trans.to.toLowerCase() === "trashed";
        }
        if (selectedActionFilter === "deleted") {
          return trans.to.toLowerCase() === "deleted";
        }
        if (selectedActionFilter === "updated") {
          return trans.type === "update" || trans.type === "seo";
        }
      }
      return true;
    });
  }, [rawLogs, selectedCategories, selectedActor, selectedActionFilter, deferredSearch]);

  // Prepare data for ExportColumnsModal — lazy evaluated only when export modal is actually open
  const exportPreparedData = useMemo(() => {
    if (!isExportModalOpen) return [];
    return filteredLogs.map((item) => {
      const trans = getTransitionInfo(item);
      const explanation = getSimpleExplanation(item);
      const itemInfo = getItemCleanName(item);
      return {
        id: item.id,
        timestamp: format(new Date(item.timestamp), "yyyy-MM-dd HH:mm:ss"),
        category: item.category,
        eventType: item.eventType,
        itemName: itemInfo.name,
        itemType: itemInfo.type,
        itemSlug: itemInfo.slug ? `/${itemInfo.slug.replace(/^\//, "")}` : "",
        transition: trans.pillText || (trans.from.toLowerCase() !== trans.to.toLowerCase() ? `${trans.from} ➔ ${trans.to}` : "Content Updated"),
        explanation,
        actorName: item.actor.name,
        actorEmail: item.actor.email,
        actorRole: item.actor.role,
        status: item.status,
      };
    });
  }, [filteredLogs, isExportModalOpen]);

  // Group logs chronologically by Day
  const groupedLogs = useMemo(() => {
    const groups: {
      [key: string]: {
        label: string;
        date: Date;
        items: AuditLogItem[];
      };
    } = {};

    for (const item of filteredLogs) {
      const d = new Date(item.timestamp);
      const key = format(d, "yyyy-MM-dd");
      if (!groups[key]) {
        let label = format(d, "EEEE, MMMM d, yyyy");
        if (isToday(d)) {
          label = `Today — ${format(d, "MMMM d, yyyy")}`;
        } else if (isYesterday(d)) {
          label = `Yesterday — ${format(d, "MMMM d, yyyy")}`;
        }
        groups[key] = { label, date: d, items: [] };
      }
      groups[key].items.push(item);
    }

    return Object.values(groups).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [filteredLogs]);

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const handleSelectLog = useCallback((item: AuditLogItem) => {
    setSelectedLog(item);
  }, []);

  return (
    <div className="w-full min-h-screen bg-background p-3 sm:p-5 flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-xl shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          {/* Back Button to Dashboard */}
          <Link href="/">
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
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live PostgreSQL Stream
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Authoritative audit record of all site modifications: status transitions, draft vs published, trash, and content edits
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Export Modal Trigger */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isValidating}
            className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer border-border"
          >
            <RefreshCw
              className={`size-3.5 ${
                isValidating ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            disabled={filteredLogs.length === 0}
            className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer border-border"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Export Data</span>
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

          {/* Unified Filter Toolbar (Search on Left, Category Checkbox Dropdown + State Select + Member Select on Right) */}
          <div className="p-3 bg-card border border-border rounded-xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
            {/* Quick Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by page, article title, slug, or team member..."
                className="h-8 pl-8 pr-7 text-xs bg-muted/40 border-border rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Placed Beside State Option */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Category Filter Checkbox Dropdown (Like Bulk Edit page) */}
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs cursor-pointer border-border font-medium gap-1.5"
                    >
                      <Filter className="size-3.5 text-muted-foreground" />
                      <span>
                        Categories{" "}
                        {selectedCategories.size > 0 && selectedCategories.size < CATEGORY_OPTIONS.length
                          ? `(${selectedCategories.size})`
                          : "(All)"}
                      </span>
                    </Button>
                  }
                />
                <PopoverContent align="end" className="w-64 p-3 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                      Categories
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCategories(new Set())}
                        className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                      >
                        All
                      </button>
                      <span className="text-muted-foreground text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCategories(new Set(["PAGES", "BLOGS"]))}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                      >
                        Pages only
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const isChecked = selectedCategories.size === 0 || selectedCategories.has(cat.key);
                      const Icon = cat.icon;
                      return (
                        <div
                          key={cat.key}
                          onClick={() => {
                            const next = new Set(
                              selectedCategories.size === 0
                                ? CATEGORY_OPTIONS.map((c) => c.key)
                                : selectedCategories
                            );
                            if (isChecked && selectedCategories.size !== 0) {
                              next.delete(cat.key);
                            } else if (isChecked && selectedCategories.size === 0) {
                              // If all were active, uncheck this one
                              next.delete(cat.key);
                            } else {
                              next.add(cat.key);
                            }
                            // If all or none selected, reset to empty Set (meaning all)
                            if (next.size === CATEGORY_OPTIONS.length || next.size === 0) {
                              setSelectedCategories(new Set());
                            } else {
                              setSelectedCategories(next);
                            }
                          }}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/70 cursor-pointer text-xs font-medium text-foreground select-none transition-colors"
                        >
                          <Checkbox checked={isChecked} />
                          <Icon className="size-3.5 text-muted-foreground" />
                          <span>{cat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {/* State Transition Filter (Custom Select) */}
              <div className="flex items-center gap-1.5">
                <Select
                  value={selectedActionFilter}
                  onValueChange={(val) => setSelectedActionFilter(val || "ALL")}
                >
                  <SelectTrigger className="h-8 px-2.5 text-xs bg-muted/40 border-border cursor-pointer min-w-[130px]">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} sideOffset={4} className="min-w-[160px]">
                    <SelectItem value="ALL" label="All States" className="text-xs font-semibold cursor-pointer">
                      All States
                    </SelectItem>
                    <SelectItem value="published" label="Published / Live" className="text-xs font-semibold cursor-pointer text-emerald-600 dark:text-emerald-400">
                      Published / Live
                    </SelectItem>
                    <SelectItem value="draft" label="Drafts / Inactive" className="text-xs font-semibold cursor-pointer text-amber-600 dark:text-amber-400">
                      Drafts / Inactive
                    </SelectItem>
                    <SelectItem value="updated" label="Content & SEO Edits" className="text-xs font-semibold cursor-pointer text-blue-600 dark:text-blue-400">
                      Content & SEO Edits
                    </SelectItem>
                    <SelectItem value="trashed" label="Trashed" className="text-xs font-semibold cursor-pointer text-orange-600 dark:text-orange-400">
                      Trashed
                    </SelectItem>
                    <SelectItem value="deleted" label="Permanently Deleted" className="text-xs font-semibold cursor-pointer text-rose-600 dark:text-rose-400">
                      Permanently Deleted
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Team Member Filter (Custom Select) */}
              {uniqueActors.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={selectedActor}
                    onValueChange={(val) => setSelectedActor(val || "ALL")}
                  >
                    <SelectTrigger className="h-8 px-2.5 text-xs bg-muted/40 border-border cursor-pointer min-w-[140px]">
                      <SelectValue placeholder="All Team Members" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} sideOffset={4} className="min-w-[170px]">
                      <SelectItem value="ALL" label="All Team Members" className="text-xs font-semibold cursor-pointer">
                        All Team Members
                      </SelectItem>
                      {uniqueActors.map((actor) => (
                        <SelectItem key={actor.email} value={actor.email} label={actor.name} className="text-xs font-medium cursor-pointer">
                          {actor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Clean, Strictly Aligned Table */}
          <div className="flex-1 rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              {isLoading && rawLogs.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground space-y-2">
                  <Loader2 className="size-6 mx-auto animate-spin text-primary" />
                  <p className="text-xs font-medium">Fetching verified audit log stream from PostgreSQL...</p>
                </div>
              ) : groupedLogs.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground space-y-2">
                  <Layers className="size-8 mx-auto opacity-40 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">No matching audit events recorded</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Publishing, modifying, or deleting pages, blogs, redirects, or settings will automatically stream here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[18%]" />
                    <col className="w-[26%]" />
                    <col className="w-[16%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider font-bold text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                      <th className="py-3 px-4">Affected Item</th>
                      <th className="py-3 px-4">What Changed</th>
                      <th className="py-3 px-4">Activity Summary</th>
                      <th className="py-3 px-4">Changed By</th>
                      <th className="py-3 px-4 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {groupedLogs.map((group) => (
                      <React.Fragment key={group.label}>
                        {/* Date Group Header Row */}
                        <tr className="bg-muted/30 border-y border-border/60">
                          <td colSpan={5} className="py-2 px-4">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground text-[11px] tracking-wide flex items-center gap-1.5">
                                <Clock className="size-3 text-primary" />
                                {group.label}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border-border text-muted-foreground"
                              >
                                {group.items.length} event{group.items.length > 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </td>
                        </tr>

                        {/* Event Rows */}
                        {group.items.map((item) => (
                          <AuditLogRow
                            key={item.id}
                            item={item}
                            onSelect={handleSelectLog}
                          />
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer with Pagination Controls */}
            <div className="py-2.5 px-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground shrink-0">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-foreground">{filteredLogs.length}</strong> of{" "}
                  <strong className="text-foreground">{totalItems}</strong> matching events
                  {stats.totalEvents > totalItems && (
                    <span className="text-muted-foreground/80"> ({stats.totalEvents} total in history)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium mr-1 text-muted-foreground">
                  Page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer border-border"
                >
                  <ChevronLeft className="size-3" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer border-border"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Slide-Out Inspector Drawer (Sheet) — Non-Coder Friendly Detail View */}
      <Sheet open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-background border-l border-border">
          <AuditLogInspector log={selectedLog} onClose={() => setSelectedLog(null)} />
        </SheetContent>
      </Sheet>

      {/* Export Columns Selection Modal (CSV / JSON with confirmation) */}
      <ExportColumnsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entityName="Audit Logs"
        columns={AUDIT_EXPORT_COLUMNS}
        data={exportPreparedData}
      />
    </div>
  );
}
