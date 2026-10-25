import type { AuditLogItem, TransitionInfo, ItemCleanInfo } from "../types";

export function formatDiffValue(val: any): string {
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

export function getTransitionInfo(item: AuditLogItem): TransitionInfo {
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
    if (
      meta.toStatus === "draft" ||
      meta.toStatus === "inactive" ||
      meta.toStatus === "unsubscribed"
    ) {
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

    case "PAGE.CONTENT_UPDATED":
    case "BLOG.CONTENT_UPDATED":
      return { from: "Body", to: "Updated", type: "update", pillText: "Content Updated" };

    case "PAGE.UPDATED":
    case "BLOG.UPDATED":
      if (meta.contentChanged) {
        return { from: "Body", to: "Updated", type: "update", pillText: "Content Updated" };
      }
      if (meta.fromTitle && meta.toTitle && meta.fromTitle !== meta.toTitle) {
        return { from: "Title", to: "Renamed", type: "update", pillText: "Title Renamed" };
      }
      if (meta.changedFields && Array.isArray(meta.changedFields) && meta.changedFields.length > 0) {
        if (meta.changedFields.length === 1) {
          const field = meta.changedFields[0];
          const label = meta.diff?.[field]?.label || field;
          return { from: label, to: "Updated", type: "update", pillText: `${label} Updated` };
        }
        return {
          from: "Fields",
          to: `${meta.changedFields.length} Updated`,
          type: "update",
          pillText: `${meta.changedFields.length} Fields Updated`,
        };
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
      return {
        from: "New",
        to: "Active",
        type: "publish",
        pillText: `${meta.statusCode || 301} Redirect Added`,
      };
    case "REDIRECTION.STATUS_CHANGED":
      return {
        from: meta.fromStatus || "Active",
        to: meta.toStatus || "Inactive",
        type: meta.toStatus === "active" ? "publish" : "draft",
      };
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
      return {
        from: meta.fromStatus || "Active",
        to: meta.toStatus || "Unsubscribed",
        type: meta.toStatus === "active" ? "publish" : "draft",
      };
    case "NEWSLETTERS.SUBSCRIBER_DELETED":
      return { from: "Active", to: "Deleted", type: "delete" };

    case "MEDIA.UPLOADED":
      return { from: "Upload", to: "Stored", type: "publish", pillText: "Media Uploaded" };
    case "MEDIA.DELETED":
      return { from: "Storage", to: "Deleted", type: "delete", pillText: "Asset Removed" };

    case "AUTH.LOGIN_SUCCESS":
      return { from: "Auth", to: "Logged In", type: "publish", pillText: "Login Success" };
    case "AUTH.LOGIN_FAILED":
      return { from: "Auth", to: "Failed", type: "delete", pillText: "Login Failed" };
    case "AUTH.LOGOUT":
      return { from: "Auth", to: "Signed Out", type: "draft", pillText: "Logged Out" };

    case "DATA.EXPORTED":
      return { from: "Data", to: "Exported", type: "neutral", pillText: "Export Created" };

    case "SCHEDULE.TRIGGERED_MANUALLY":
      return { from: "Schedule", to: "Executed", type: "publish", pillText: "Manual Trigger" };

    case "BLOG.AUTO_PUBLISHED":
      return { from: "Scheduled", to: "Published", type: "publish", pillText: "Auto Published" };

    case "BLOG.REVISION_RESTORED":
      return { from: "Revision", to: "Restored", type: "restore", pillText: "Revision Restored" };

    case "BLOG.SCHEDULED":
      return { from: "Draft", to: "Scheduled", type: "publish", pillText: "Article Scheduled" };

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
        return {
          from: "Profile",
          to: `${meta.changedFields.length} Updated`,
          type: "update",
          pillText: `${meta.changedFields.length} Fields Updated`,
        };
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

/**
 * Crisp, concise explanations without redundant wall-of-text.
 * Explicitly prioritizes content changes so users clearly see "Updated article content"
 * or "Updated page content", even for historical records where legacy code logged field counts.
 */
export function getSimpleExplanation(item: AuditLogItem): string {
  const meta = item.metadata || {};
  const event = item.eventType;

  // 1. Critical Priority: Body Content Changed
  if (
    event === "BLOG.CONTENT_UPDATED" ||
    (meta.contentChanged && item.category === "BLOGS")
  ) {
    if (meta.fromTitle && meta.toTitle && meta.fromTitle !== meta.toTitle) {
      return `Updated article content & renamed to "${meta.toTitle}"`;
    }
    return "Updated article content";
  }

  if (
    event === "PAGE.CONTENT_UPDATED" ||
    (meta.contentChanged && item.category === "PAGES")
  ) {
    if (meta.fromTitle && meta.toTitle && meta.fromTitle !== meta.toTitle) {
      return `Updated page content & renamed to "${meta.toTitle}"`;
    }
    return "Updated page content";
  }

  // 2. Scheduled, Restored, or Specific System Events
  if (event === "BLOG.AUTO_PUBLISHED") {
    return item.action || "Auto-published scheduled article";
  }
  if (event === "BLOG.REVISION_RESTORED") {
    return item.action || "Restored article revision";
  }
  if (event === "BLOG.SCHEDULED") {
    return item.action || "Scheduled article for publication";
  }
  if (event === "SCHEDULE.TRIGGERED_MANUALLY") {
    return item.action || "Triggered manual scheduled publish";
  }
  if (event === "DATA.EXPORTED") {
    return item.action || "Exported data records";
  }
  if (event === "MEDIA.UPLOADED") {
    return item.action || "Uploaded media image";
  }
  if (event === "AUTH.LOGIN_SUCCESS") {
    return item.action || "User signed in";
  }
  if (event === "AUTH.LOGIN_FAILED") {
    return item.action || "Failed login attempt";
  }
  if (event === "AUTH.LOGOUT") {
    return item.action || "User signed out";
  }

  // 3. Fall back to authoritative server action string if clean and present
  if (item.action && item.action.trim()) {
    return item.action;
  }

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
      return item.action || "Saved system changes";
  }
}

export function getItemCleanName(item: AuditLogItem): ItemCleanInfo {
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
  if (target.startsWith("Export: ")) {
    return {
      name: target.replace(/^Export:\s*/, ""),
      type: "Data Export",
      slug: meta.filename,
      cmsUrl: undefined,
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
  if (item.category === "AUTH" || item.category === "SECURITY") {
    return {
      name: target || (item.category === "AUTH" ? "Authentication Session" : "Security Gateway"),
      type: item.category === "AUTH" ? "Auth" : "Security",
      slug: meta.email,
      cmsUrl: "/account",
    };
  }

  return { name: target || "System", type: item.category };
}
