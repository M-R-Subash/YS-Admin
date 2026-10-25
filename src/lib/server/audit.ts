import prisma from "@/lib/prisma";
import { headers } from "next/headers";

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

export type AuditStatus = "SUCCESS" | "WARNING" | "FAILED";

export interface LogAuditOptions {
  eventType: string;
  category: AuditCategory;
  action: string;
  target?: string;
  status?: AuditStatus;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface DiffEntry {
  field: string;
  label: string;
  from: any;
  to: any;
}

export type DiffMap = Record<string, DiffEntry>;

export interface EntityDiffAnalysis {
  eventType: string;
  actionSummary: string;
  entityLabel: string;
  fromStatus: string;
  toStatus: string;
  statusChanged: boolean;
  contentChanged: boolean;
  changedFieldKeys: string[];
  diff: DiffMap;
  extraMeta: Record<string, any>;
}

interface FieldConfig {
  key: string;
  label: string;
  isPassword?: boolean;
  isArray?: boolean;
}

const BLOG_FIELDS: FieldConfig[] = [
  { key: "title", label: "Title" },
  { key: "slug", label: "Slug" },
  { key: "excerpt", label: "Excerpt" },
  { key: "featuredImage", label: "Featured Image" },
  { key: "allowComments", label: "Allow Comments" },
  { key: "categories", label: "Categories", isArray: true },
  { key: "tags", label: "Tags", isArray: true },
  { key: "author", label: "Author" },
  { key: "readingTime", label: "Reading Time" },
  { key: "notifyNewsletter", label: "Newsletter Blast" },
  // SEO attributes
  { key: "metaTitle", label: "Meta Title" },
  { key: "metaDesc", label: "Meta Description" },
  { key: "focusKeyword", label: "Focus Keyword" },
  { key: "ogImage", label: "Social Share Image" },
  { key: "ogTitle", label: "Social Title" },
  { key: "ogDesc", label: "Social Description" },
  { key: "canonicalUrl", label: "Canonical URL" },
  { key: "noIndex", label: "Search Indexing" },
  { key: "authorName", label: "Author Name" },
  { key: "authorRole", label: "Author Role" },
  { key: "authorDescription", label: "Author Bio" },
];

const PAGE_FIELDS: FieldConfig[] = [
  { key: "title", label: "Title" },
  { key: "slug", label: "Slug" },
  { key: "author", label: "Author" },
  // SEO attributes
  { key: "metaTitle", label: "Meta Title" },
  { key: "metaDesc", label: "Meta Description" },
  { key: "focusKeyword", label: "Focus Keyword" },
  { key: "ogImage", label: "Social Share Image" },
  { key: "ogTitle", label: "Social Title" },
  { key: "ogDesc", label: "Social Description" },
  { key: "canonicalUrl", label: "Canonical URL" },
  { key: "noIndex", label: "Search Indexing" },
  { key: "authorName", label: "Author Name" },
  { key: "authorRole", label: "Author Role" },
  { key: "authorDescription", label: "Author Bio" },
];

const USER_FIELDS: FieldConfig[] = [
  { key: "name", label: "Full Name" },
  { key: "email", label: "Email Address" },
  { key: "role", label: "Role" },
  { key: "authorRole", label: "Author Role" },
  { key: "description", label: "User Bio" },
  { key: "profilePicture", label: "Profile Picture" },
  { key: "password", label: "Password", isPassword: true },
];

const REDIRECTION_FIELDS: FieldConfig[] = [
  { key: "sourceUrl", label: "Source Path" },
  { key: "destinationUrl", label: "Destination URL" },
  { key: "statusCode", label: "Redirect Status Code" },
];

const TAXONOMY_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  { key: "description", label: "Description" },
];

function arraysDiffer(a: any, b: any): boolean {
  const arrA = Array.isArray(a)
    ? a.map(String).map((s) => s.trim()).filter(Boolean).sort()
    : [];
  const arrB = Array.isArray(b)
    ? b.map(String).map((s) => s.trim()).filter(Boolean).sort()
    : [];
  if (arrA.length !== arrB.length) return true;
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) return true;
  }
  return false;
}

function valuesDiffer(a: any, b: any): boolean {
  if (a === undefined && b === undefined) return false;
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Boolean(a) !== Boolean(b);
  }
  const normA = a === null || a === undefined ? "" : String(a).trim();
  const normB = b === null || b === undefined ? "" : String(b).trim();
  return normA !== normB;
}

function getFieldValue(obj: any, key: string): any {
  if (!obj) return undefined;
  if (key === "author") {
    // Identify author consistently via authorId or author object
    return obj.authorId || obj.author?.id || obj.author?.name || obj.author?.email || obj.author;
  }
  if (key === "authorName") {
    return obj.seo?.authorName !== undefined ? obj.seo.authorName : obj.authorName;
  }
  if (key === "authorRole") {
    return obj.seo?.authorRole !== undefined ? obj.seo.authorRole : obj.authorRole;
  }
  if (key === "authorDescription") {
    return obj.seo?.authorDescription !== undefined ? obj.seo.authorDescription : obj.authorDescription;
  }
  if (key === "description") {
    return obj.description !== undefined ? obj.description : obj.bio;
  }
  if (key === "profilePicture") {
    return obj.profilePicture !== undefined ? obj.profilePicture : obj.image;
  }
  if (obj[key] !== undefined) return obj[key];
  if (obj.seo && obj.seo[key] !== undefined) return obj.seo[key];
  return undefined;
}

function contentDiffers(contentA: any, contentB: any): boolean {
  if (contentA === undefined && contentB === undefined) return false;
  // If either content snapshot is missing, don't report false-positive content change
  if (contentA === undefined || contentB === undefined) return false;
  const strA = typeof contentA === "string" ? contentA : JSON.stringify(contentA ?? "");
  const strB = typeof contentB === "string" ? contentB : JSON.stringify(contentB ?? "");
  return strA !== strB;
}

/**
 * Universal Entity Diff Analyzer.
 * Compares two snapshots of a resource and extracts an authoritative diff,
 * eventType, and human-friendly activity summary.
 */
export function analyzeEntityDiff(
  category: AuditCategory,
  before: Record<string, any> = {},
  after: Record<string, any> = {}
): EntityDiffAnalysis {
  const diff: DiffMap = {};
  const changedFieldKeys: string[] = [];

  let fieldConfigs: FieldConfig[] = [];
  let entityLabel = "Item";
  let categoryPrefix = "ITEM";

  switch (category) {
    case "BLOGS":
      fieldConfigs = BLOG_FIELDS;
      entityLabel = "Article";
      categoryPrefix = "BLOG";
      break;
    case "PAGES":
      fieldConfigs = PAGE_FIELDS;
      entityLabel = "Page";
      categoryPrefix = "PAGE";
      break;
    case "USERS":
      fieldConfigs = USER_FIELDS;
      entityLabel = "User";
      categoryPrefix = "USER";
      break;
    case "REDIRECTIONS":
      fieldConfigs = REDIRECTION_FIELDS;
      entityLabel = "Redirection";
      categoryPrefix = "REDIRECTION";
      break;
    case "TAXONOMY":
      fieldConfigs = TAXONOMY_FIELDS;
      entityLabel = "Taxonomy";
      categoryPrefix = "TAXONOMY";
      break;
    default:
      fieldConfigs = [];
      entityLabel = "Item";
      categoryPrefix = category;
  }

  // 1. Check status and trash transitions
  const fromStatus = before.isTrashed ? "trash" : before.status || "draft";
  const toStatus = after.isTrashed ? "trash" : after.status || fromStatus;
  const statusChanged = fromStatus !== toStatus;

  // 2. Check body content modification (without storing giant strings)
  const contentChanged = contentDiffers(before.content, after.content);

  // 3. Compare tracked attributes
  for (const field of fieldConfigs) {
    const valBefore = getFieldValue(before, field.key);
    const valAfter = getFieldValue(after, field.key);

    if (valBefore === undefined && valAfter === undefined) {
      continue;
    }

    if (field.isPassword) {
      // Prevent false-positive password reporting:
      // Only flag if explicitly marked or if a new password string differs from the existing record
      const hasPasswordChanged =
        after.passwordChanged === true ||
        (Boolean(valAfter) &&
          valAfter !== valBefore &&
          valAfter !== before.password &&
          (valAfter === "••••••••" || typeof valAfter === "string"));

      if (hasPasswordChanged) {
        diff[field.key] = {
          field: field.key,
          label: field.label,
          from: "••••••••",
          to: "••••••••",
        };
        changedFieldKeys.push(field.key);
      }
      continue;
    }

    if (field.isArray) {
      if (arraysDiffer(valBefore, valAfter)) {
        diff[field.key] = {
          field: field.key,
          label: field.label,
          from: Array.isArray(valBefore) ? valBefore : [],
          to: Array.isArray(valAfter) ? valAfter : [],
        };
        changedFieldKeys.push(field.key);
      }
    } else {
      if (valuesDiffer(valBefore, valAfter)) {
        diff[field.key] = {
          field: field.key,
          label: field.label,
          from: valBefore ?? null,
          to: valAfter ?? null,
        };
        changedFieldKeys.push(field.key);
      }
    }
  }

  // 4. Determine EventType
  let eventType = `${categoryPrefix}.UPDATED`;
  const isOnlySeo =
    changedFieldKeys.length > 0 &&
    changedFieldKeys.every((k) =>
      [
        "metaTitle",
        "metaDesc",
        "focusKeyword",
        "ogImage",
        "ogTitle",
        "ogDesc",
        "canonicalUrl",
        "noIndex",
      ].includes(k)
    );

  if (statusChanged) {
    if (toStatus === "trash") {
      eventType = `${categoryPrefix}.TRASHED`;
    } else if (fromStatus === "trash") {
      eventType = `${categoryPrefix}.RESTORED`;
    } else if (toStatus === "published" || toStatus === "active") {
      eventType = `${categoryPrefix}.PUBLISHED`;
    } else if (toStatus === "draft" || toStatus === "inactive") {
      eventType = `${categoryPrefix}.SET_TO_DRAFT`;
    }
  } else if (category === "USERS" && diff["role"]) {
    eventType = "USER.ROLE_UPDATED";
  } else if (category === "USERS" && diff["password"]) {
    eventType = "USER.PASSWORD_CHANGED";
  } else if (contentChanged) {
    eventType = `${categoryPrefix}.CONTENT_UPDATED`;
  } else if (isOnlySeo) {
    eventType = `${categoryPrefix}.SEO_UPDATED`;
  }

  // 5. Construct Human-Friendly Action Summary
  let actionSummary = "";

  if (statusChanged) {
    if (toStatus === "published" || toStatus === "active") {
      actionSummary = `Published ${entityLabel.toLowerCase()} live`;
    } else if (toStatus === "draft" || toStatus === "inactive") {
      actionSummary = `Reverted ${entityLabel.toLowerCase()} to draft`;
    } else if (toStatus === "trash") {
      actionSummary = `Moved ${entityLabel.toLowerCase()} to trash`;
    } else if (fromStatus === "trash") {
      actionSummary = `Restored ${entityLabel.toLowerCase()} from trash`;
    }
    if (contentChanged) {
      actionSummary += " & updated content";
    }
  } else if (contentChanged) {
    // Content changed: Prioritize saying "Updated article content" or "Updated page content"
    if (diff["title"]) {
      const toTitle = String(diff["title"].to || "");
      actionSummary = `Updated ${entityLabel.toLowerCase()} content & renamed to "${toTitle}"`;
    } else {
      actionSummary = `Updated ${entityLabel.toLowerCase()} content`;
    }
  } else if (diff["title"]) {
    const fromTitle = String(diff["title"].from || "");
    const toTitle = String(diff["title"].to || "");
    actionSummary = `Renamed ${entityLabel.toLowerCase()} from "${fromTitle}" to "${toTitle}"`;
  } else if (diff["name"] && category === "USERS") {
    actionSummary = `Renamed user to "${diff["name"].to}"`;
  } else if (diff["role"] && category === "USERS") {
    actionSummary = `Changed user role to ${diff["role"].to}`;
  } else if (diff["password"] && category === "USERS") {
    actionSummary = `Changed account password`;
  } else if (isOnlySeo) {
    const seoLabels = changedFieldKeys
      .map((k) => diff[k]?.label || k)
      .slice(0, 3)
      .join(", ");
    actionSummary = `Updated SEO metadata (${seoLabels})`;
  } else if (changedFieldKeys.length > 0) {
    const labels = changedFieldKeys.map((k) => diff[k]?.label || k);
    const displayLabels =
      labels.slice(0, 3).join(", ") +
      (labels.length > 3 ? ` +${labels.length - 3} more` : "");
    actionSummary = `Updated ${changedFieldKeys.length} field${
      changedFieldKeys.length > 1 ? "s" : ""
    }: ${displayLabels}`;
  } else {
    actionSummary = `Saved ${entityLabel.toLowerCase()} modifications`;
  }

  return {
    eventType,
    actionSummary,
    entityLabel,
    fromStatus,
    toStatus,
    statusChanged,
    contentChanged,
    changedFieldKeys,
    diff,
    extraMeta: {
      title: after?.title || before?.title,
      slug: after?.slug || before?.slug,
      fromTitle: diff["title"] ? diff["title"].from : undefined,
      toTitle: diff["title"] ? diff["title"].to : undefined,
      fromSlug: diff["slug"] ? diff["slug"].from : undefined,
      toSlug: diff["slug"] ? diff["slug"].to : undefined,
    },
  };
}

/**
 * Universal Entity Mutation Logger.
 * Compares before/after state and persists authoritative audit log with field-level diffs.
 */
export async function logEntityMutation(options: {
  category: AuditCategory;
  entityName?: string;
  target?: string;
  before: any;
  after: any;
  userId: string;
  request?: Request;
  customAction?: string;
  customEventType?: string;
  extraMeta?: Record<string, any>;
}): Promise<void> {
  const {
    category,
    target,
    before,
    after,
    userId,
    request,
    customAction,
    customEventType,
    extraMeta,
  } = options;
  const analysis = analyzeEntityDiff(category, before, after);

  // If literally nothing changed, skip writing a redundant audit log entry
  if (
    analysis.changedFieldKeys.length === 0 &&
    !analysis.contentChanged &&
    !analysis.statusChanged &&
    !customAction &&
    !customEventType
  ) {
    return;
  }

  const clientMeta = await getClientAuditMeta(request);
  const slug = after?.slug || before?.slug;
  const slugSuffix = slug ? ` (/${String(slug).replace(/^\//, "")})` : "";
  const targetLabel =
    target ||
    `${analysis.entityLabel}: ${
      after?.title || after?.name || before?.title || before?.name || "Item"
    }${slugSuffix}`;

  // Preserve actor identity snapshot so deleting a user later never erases historical attribution
  let actorSnapshot: { name?: string; email?: string; role?: string; avatar?: string } | undefined = undefined;
  if (userId) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true, profilePicture: true },
      });
      if (u) {
        actorSnapshot = {
          name: u.name || undefined,
          email: u.email,
          role: u.role,
          avatar: u.profilePicture || undefined,
        };
      }
    } catch {
      // Non-blocking user lookup
    }
  }

  await recordAuditLog({
    eventType: customEventType || analysis.eventType,
    category,
    action: customAction || analysis.actionSummary,
    target: targetLabel,
    userId,
    status: "SUCCESS",
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
    metadata: {
      diff: analysis.diff,
      fromStatus: analysis.fromStatus,
      toStatus: analysis.toStatus,
      changedFields: analysis.changedFieldKeys,
      contentChanged: analysis.contentChanged,
      ...(actorSnapshot ? { _actorSnapshot: actorSnapshot } : {}),
      ...analysis.extraMeta,
      ...(extraMeta || {}),
    },
  });
}

/**
 * Utility to extract client IP and User Agent from request headers
 */
export async function getClientAuditMeta(request?: Request): Promise<{
  ipAddress: string;
  userAgent: string;
}> {
  try {
    let reqHeaders: Headers;

    if (request) {
      reqHeaders = request.headers;
    } else {
      reqHeaders = await headers();
    }

    const forwarded = reqHeaders.get("x-forwarded-for");
    const rawIp = forwarded?.split(",")[0]?.trim() || reqHeaders.get("x-real-ip");
    const ipAddress = rawIp || "Unknown";
    const userAgent = reqHeaders.get("user-agent") || "Unknown Client";

    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: "Unknown", userAgent: "Unknown Client" };
  }
}

/**
 * Non-blocking, production-safe audit log recorder.
 * Automatically persists audit events to PostgreSQL.
 */
export async function recordAuditLog(options: LogAuditOptions): Promise<void> {
  try {
    let ipAddress = options.ipAddress;
    let userAgent = options.userAgent;

    if (!ipAddress || !userAgent) {
      const meta = await getClientAuditMeta();
      ipAddress = ipAddress || meta.ipAddress;
      userAgent = userAgent || meta.userAgent;
    }

    const metadata: Record<string, any> = options.metadata ? { ...options.metadata } : {};

    // Auto-capture immutable actor snapshot whenever userId is provided
    if (options.userId && !metadata._actorSnapshot) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: options.userId },
          select: { name: true, email: true, role: true, profilePicture: true },
        });
        if (u) {
          metadata._actorSnapshot = {
            name: u.name || undefined,
            email: u.email,
            role: u.role,
            avatar: u.profilePicture || undefined,
          };
        }
      } catch {
        // Non-blocking lookup
      }
    }

    await prisma.auditLog.create({
      data: {
        eventType: options.eventType,
        category: options.category,
        action: options.action,
        target: options.target || null,
        status: options.status || "SUCCESS",
        userId: options.userId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
    });
  } catch (error) {
    // Fail-open: Never allow audit logging failure to crash primary business transactions
    console.error("Failed to record audit log:", error);
  }
}
