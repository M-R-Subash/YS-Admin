import {
  FileText,
  BookOpen,
  ArrowRightLeft,
  Hash,
  Mail,
  Image as ImageIcon,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import type { ExportColumnOption } from "@/components/spreadsheet/ExportColumnsModal";

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

export interface AuditLogActor {
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface AuditLogItem {
  id: string;
  eventType: string;
  category: AuditCategory;
  action: string;
  actor: AuditLogActor;
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
    retentionPolicyEnforced?: boolean;
  };
}

export interface TransitionInfo {
  from: string;
  to: string;
  type: "publish" | "draft" | "trash" | "restore" | "delete" | "update" | "seo" | "neutral";
  pillText?: string;
}

export interface ItemCleanInfo {
  name: string;
  type: string;
  slug?: string;
  cmsUrl?: string;
}

export const CATEGORY_OPTIONS: { key: AuditCategory; label: string; icon: any }[] = [
  { key: "PAGES", label: "Pages", icon: FileText },
  { key: "BLOGS", label: "Blogs", icon: BookOpen },
  { key: "REDIRECTIONS", label: "Redirections", icon: ArrowRightLeft },
  { key: "TAXONOMY", label: "Taxonomy", icon: Hash },
  { key: "NEWSLETTERS", label: "Newsletters", icon: Mail },
  { key: "MEDIA", label: "Media Assets", icon: ImageIcon },
  { key: "COMMENTS", label: "Comments", icon: MessageSquare },
  { key: "USERS", label: "Team Members", icon: Users },
  { key: "SETTINGS", label: "Settings", icon: SettingsIcon },
  { key: "AUTH", label: "Authentication", icon: KeyRound },
  { key: "SECURITY", label: "Security", icon: ShieldCheck },
];

export const AUDIT_EXPORT_COLUMNS: ExportColumnOption[] = [
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
