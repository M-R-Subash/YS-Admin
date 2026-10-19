import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export type AuditCategory =
  | "BLOGS"
  | "PAGES"
  | "MEDIA"
  | "COMMENTS"
  | "USERS"
  | "SETTINGS"
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
    const ipAddress =
      forwarded?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "127.0.0.1";

    const userAgent = reqHeaders.get("user-agent") || "Unknown Client";

    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: "127.0.0.1", userAgent: "Unknown Client" };
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
        metadata: options.metadata || undefined,
      },
    });
  } catch (error) {
    // Fail-open: Never allow audit logging failure to crash primary business transactions
    console.error("Failed to record audit log:", error);
  }
}
