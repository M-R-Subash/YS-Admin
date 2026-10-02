export interface FormSubmission {
  id: string;
  formName: string;
  sourceUrl: string | null;
  payload: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  isRead: boolean;
  isTrashed: boolean;
  createdAt: string;
}

export interface SubmissionsResponse {
  submissions?: FormSubmission[];
  totalCount?: number;
  unreadCount?: number;
  trashedCount?: number;
}

export type FilterType = "all" | "unread" | "read" | "trashed";
export type MobileView = "list" | "detail";

// Helper to extract sender name from payload
export function getSenderName(payload: Record<string, unknown> | null | undefined): string {
  if (!payload) return "Anonymous Lead";
  const p = payload as Record<string, string | undefined>;
  if (p.name) return p.name;
  if (p.firstName || p.lastName) {
    return `${p.firstName || ""} ${p.lastName || ""}`.trim();
  }
  if (p.email) return p.email;
  return "Anonymous Lead";
}

// Helper to format payload keys (e.g. firstName -> First Name)
export function formatKeyName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

// Check if key is Name, Email, or Phone for selective copy button display
export function isCopyableField(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k === "name" ||
    k === "firstname" ||
    k === "lastname" ||
    k === "email" ||
    k === "phone" ||
    k === "phonenumber" ||
    k === "mobile"
  );
}
