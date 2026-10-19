import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "ALL";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build Prisma query filters
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

    // Parallel fetch logs, total count, and category grouping in just 3 efficient queries
    const [rawLogs, total, categoryCounts] = await Promise.all([
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
    for (const item of categoryCounts) {
      countsMap[item.category] = item._count._all;
    }

    // Format logs for client consumption
    const logs = rawLogs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      category: log.category,
      action: log.action,
      target: log.target || "System",
      status: log.status,
      ipAddress: log.ipAddress || "127.0.0.1",
      timestamp: log.createdAt.toISOString(),
      metadata: log.metadata,
      actor: {
        name: log.user?.name || "System Admin",
        email: log.user?.email || "system@ysinnovations.com",
        avatar: log.user?.profilePicture || "",
        role: log.user?.role || "ADMIN",
      },
    }));

    const otherEvents =
      (countsMap["SETTINGS"] || 0) +
      (countsMap["COMMENTS"] || 0) +
      (countsMap["USERS"] || 0) +
      (countsMap["SECURITY"] || 0) +
      (countsMap["AUTH"] || 0);

    return NextResponse.json({
      logs,
      total,
      stats: {
        totalEvents: total,
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
