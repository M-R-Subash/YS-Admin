import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const VALID_CATEGORIES = new Set([
  "ALL",
  "BLOGS",
  "PAGES",
  "MEDIA",
  "COMMENTS",
  "USERS",
  "SETTINGS",
  "REDIRECTIONS",
  "NEWSLETTERS",
  "TAXONOMY",
  "AUTH",
  "SECURITY",
]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Administrator permissions required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 1. Strict Query Parameter Validation
    const rawCategory = searchParams.get("category")?.trim() || "ALL";
    if (!VALID_CATEGORIES.has(rawCategory)) {
      return NextResponse.json(
        { error: `Invalid category parameter. Supported categories: ${Array.from(VALID_CATEGORIES).join(", ")}` },
        { status: 400 }
      );
    }
    const category = rawCategory;

    const rawLimit = searchParams.get("limit");
    const limit = rawLimit === null ? 100 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: "Invalid limit parameter. Must be an integer between 1 and 200." },
        { status: 400 }
      );
    }

    const MAX_OFFSET = 10000;
    const rawOffset = searchParams.get("offset");
    const offset = rawOffset === null ? 0 : Number(rawOffset);
    if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
      return NextResponse.json(
        { error: `Invalid offset parameter. Must be an integer between 0 and ${MAX_OFFSET}.` },
        { status: 400 }
      );
    }

    // Date Range Boundaries: Protects PostgreSQL from unconstrained sequential table scans
    const startDateRaw = searchParams.get("startDate")?.trim();
    const endDateRaw = searchParams.get("endDate")?.trim();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateRaw) {
      const parsedStart = new Date(startDateRaw);
      if (isNaN(parsedStart.getTime())) {
        return NextResponse.json(
          { error: "Invalid startDate parameter. Must be a valid ISO date string." },
          { status: 400 }
        );
      }
      startDate = parsedStart;
    }

    if (endDateRaw) {
      const parsedEnd = new Date(endDateRaw);
      if (isNaN(parsedEnd.getTime())) {
        return NextResponse.json(
          { error: "Invalid endDate parameter. Must be a valid ISO date string." },
          { status: 400 }
        );
      }
      // If client supplied a date-only string (YYYY-MM-DD), extend to the end of that day (23:59:59.999Z)
      // so events occurring throughout that day are not excluded by an implicit midnight comparison
      if (/^\d{4}-\d{2}-\d{2}$/.test(endDateRaw)) {
        parsedEnd.setUTCHours(23, 59, 59, 999);
      }
      endDate = parsedEnd;
    }

    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { error: "startDate cannot be later than endDate." },
        { status: 400 }
      );
    }

    // Sanitize and cap search length
    const search = (searchParams.get("search")?.trim() || "").slice(0, 100);

    // 2. Build Prisma query filters with full type-safety
    const where: Prisma.AuditLogWhereInput = {};

    if (category !== "ALL") {
      where.category = category;
    }

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    if (search) {
      where.OR = [
        { eventType: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { target: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
        {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // 3. Parallel fetch logs, matching count, and category grouping
    const [rawLogs, matchingCount, categoryCounts] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          eventType: true,
          category: true,
          action: true,
          target: true,
          status: true,
          ipAddress: true,
          createdAt: true,
          metadata: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
      // Group by category, bounded by date range when specified to optimize DB execution
      prisma.auditLog.groupBy({
        by: ["category"],
        where: (startDate || endDate) ? { createdAt: where.createdAt } : undefined,
        _count: { _all: true },
      }),
    ]);

    const countsMap: Record<string, number> = {};
    let totalEventsInScope = 0;
    for (const item of categoryCounts) {
      countsMap[item.category] = item._count._all;
      totalEventsInScope += item._count._all;
    }

    // 4. Format logs: truthful historical attribution & metadata exposure control
    const ALLOWED_METADATA_KEYS = [
      "diff",
      "fromStatus",
      "toStatus",
      "changedFields",
      "contentChanged",
      "fromTitle",
      "toTitle",
      "fromSlug",
      "toSlug",
      "slug",
      "sourceUrl",
      "destinationUrl",
      "statusCode",
      "subject",
      "totalRecipients",
      "scheduledAt",
      "targetIds",
    ];

    const logs = rawLogs.map((log) => {
      const meta = (log.metadata as Record<string, any>) || {};
      const actorSnapshot = meta._actorSnapshot;

      // Consistently prioritize immutable historical snapshot captured at event creation.
      // Fall back to live user record only if snapshot was not present (e.g. legacy logs).
      const actorName =
        actorSnapshot?.name ||
        log.user?.name ||
        actorSnapshot?.email ||
        log.user?.email ||
        (log.userId ? "Deleted User" : "System / Automated");

      const actorEmail =
        actorSnapshot?.email ||
        log.user?.email ||
        "";

      const actorRole =
        actorSnapshot?.role ||
        log.user?.role ||
        (log.userId ? "DELETED" : "SYSTEM");

      const actorAvatar =
        actorSnapshot?.avatar ||
        log.user?.profilePicture ||
        "";

      // Sanitize metadata: Expose only known UI fields, stripping internal snapshots and secrets
      const safeMetadata: Record<string, any> = {};
      for (const key of ALLOWED_METADATA_KEYS) {
        if (meta[key] !== undefined) {
          safeMetadata[key] = meta[key];
        }
      }

      return {
        id: log.id,
        eventType: log.eventType,
        category: log.category,
        action: log.action,
        target: log.target || "System",
        status: log.status,
        ipAddress: log.ipAddress || "Unknown",
        timestamp: log.createdAt.toISOString(),
        metadata: safeMetadata,
        actor: {
          name: actorName,
          email: actorEmail,
          avatar: actorAvatar,
          role: actorRole,
        },
      };
    });

    const otherEvents =
      (countsMap["SETTINGS"] || 0) +
      (countsMap["COMMENTS"] || 0) +
      (countsMap["USERS"] || 0) +
      (countsMap["SECURITY"] || 0) +
      (countsMap["AUTH"] || 0);

    return NextResponse.json(
      {
        logs,
        total: matchingCount,
        pagination: {
          total: matchingCount,
          limit,
          offset,
          hasMore: offset + logs.length < matchingCount,
        },
        stats: {
          totalEvents: totalEventsInScope,
          matchingEvents: matchingCount,
          blogEvents: countsMap["BLOGS"] || 0,
          pageEvents: countsMap["PAGES"] || 0,
          mediaEvents: countsMap["MEDIA"] || 0,
          redirectEvents: countsMap["REDIRECTIONS"] || 0,
          taxonomyEvents: countsMap["TAXONOMY"] || 0,
          newsletterEvents: countsMap["NEWSLETTERS"] || 0,
          otherEvents,
          retentionDays: 90,
          retentionPolicyEnforced: false, // Informational: no automated DB pruning worker configured yet
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
