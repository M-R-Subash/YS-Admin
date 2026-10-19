import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    const rawOffset = searchParams.get("offset");
    const offset = rawOffset === null ? 0 : Number(rawOffset);
    if (!Number.isInteger(offset) || offset < 0) {
      return NextResponse.json(
        { error: "Invalid offset parameter. Must be a non-negative integer." },
        { status: 400 }
      );
    }

    // Sanitize and cap search length
    const search = (searchParams.get("search")?.trim() || "").slice(0, 100);

    // 2. Build Prisma query filters
    const where: any = {};

    if (category !== "ALL") {
      where.category = category;
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
        include: {
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
      prisma.auditLog.groupBy({
        by: ["category"],
        _count: { _all: true },
      }),
    ]);

    const countsMap: Record<string, number> = {};
    let totalLifetimeEvents = 0;
    for (const item of categoryCounts) {
      countsMap[item.category] = item._count._all;
      totalLifetimeEvents += item._count._all;
    }

    // 4. Format logs: truthful actor & IP attribution without fabrication
    const logs = rawLogs.map((log) => {
      const meta = (log.metadata as Record<string, any>) || {};
      const actorSnapshot = meta._actorSnapshot;

      let actorName = "System / Automated";
      let actorEmail = "";
      let actorRole = "SYSTEM";
      let actorAvatar = "";

      if (log.user) {
        actorName = log.user.name || log.user.email;
        actorEmail = log.user.email;
        actorRole = log.user.role;
        actorAvatar = log.user.profilePicture || "";
      } else if (actorSnapshot) {
        // Historical actor snapshot preserved at write time
        actorName = actorSnapshot.name || actorSnapshot.email || "Deleted User";
        actorEmail = actorSnapshot.email || "";
        actorRole = actorSnapshot.role || "DELETED";
        actorAvatar = actorSnapshot.avatar || "";
      } else if (log.userId) {
        actorName = "Deleted User";
        actorEmail = "";
        actorRole = "DELETED";
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
        metadata: log.metadata,
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

    return NextResponse.json({
      logs,
      total: matchingCount,
      pagination: {
        total: matchingCount,
        limit,
        offset,
        hasMore: offset + logs.length < matchingCount,
      },
      stats: {
        totalEvents: totalLifetimeEvents,
        matchingEvents: matchingCount,
        blogEvents: countsMap["BLOGS"] || 0,
        pageEvents: countsMap["PAGES"] || 0,
        mediaEvents: countsMap["MEDIA"] || 0,
        redirectEvents: countsMap["REDIRECTIONS"] || 0,
        taxonomyEvents: countsMap["TAXONOMY"] || 0,
        newsletterEvents: countsMap["NEWSLETTERS"] || 0,
        otherEvents,
        retentionDays: 90,
      },
    });
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
