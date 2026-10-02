export interface BlogSummary {
  id: string;
  title: string;
  slug: string;
  totalComments: number;
  pendingComments: number;
  trashedComments: number;
}

export interface CommentItem {
  id: string;
  content: string;
  isApproved: boolean;
  isTrashed: boolean;
  name: string;
  email: string;
  blogId: string;
  blog: {
    id: string;
    title: string;
    slug: string;
  };
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export type ModalActionType =
  | "approve"
  | "unapprove"
  | "trash"
  | "restore"
  | "delete"
  | "reply";

export interface ModalState {
  isOpen: boolean;
  type: ModalActionType | null;
  targetComment: CommentItem | null;
}

export interface CommentsResponse {
  comments?: CommentItem[];
  totalCount?: number;
  unapprovedCount?: number;
  trashedCount?: number;
  blogsSummary?: BlogSummary[];
}

export function formatCompactTime(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}hr${diffInHours > 1 ? "s" : ""} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}day${diffInDays > 1 ? "s" : ""} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}month${diffInMonths > 1 ? "s" : ""} ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}yr${diffInYears > 1 ? "s" : ""} ago`;
}
