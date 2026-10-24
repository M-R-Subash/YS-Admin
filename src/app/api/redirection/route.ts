import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { recordAuditLog, getClientAuditMeta } from "@/lib/server/audit";

function normalizeUrl(url: string): string {
  let cleaned = url.trim();
  if (!cleaned) return "/";

  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      const parsed = new URL(cleaned);
      cleaned = parsed.pathname;
    } catch {
      // Fallback
    }
  }

  if (!cleaned.startsWith("/")) {
    cleaned = `/${cleaned}`;
  }

  if (cleaned.length > 1 && cleaned.endsWith("/")) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

const createRedirectionSchema = z.object({
  sourceUrl: z.string().min(1, "Source URL is required"),
  destinationUrl: z.string().min(1, "Destination URL is required"),
  statusCode: z.number().int().refine((val) => val === 301 || val === 302, {
    message: "Status code must be 301 or 302",
  }),
});

// GET /api/redirection - List all redirections with pagination, search, and counts
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("status"); // "active" | "inactive" | "trashed" | "all"
    const search = searchParams.get("search")?.trim();
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const isAll = searchParams.get("all") === "true" || limitParam === "all";
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = isAll ? 0 : Math.min(Math.max(1, parseInt(limitParam || "15", 10) || 15), 100);
    const skip = isAll ? 0 : (page - 1) * limit;

    const whereClause: any = {};
    if (filter === "trash" || filter === "trashed") {
      whereClause.status = "trashed";
    } else if (filter === "published" || filter === "active") {
      whereClause.status = "active";
    } else if (filter === "draft" || filter === "inactive") {
      whereClause.status = "inactive";
    } else if (filter && filter !== "all") {
      whereClause.status = filter;
    } else {
      whereClause.status = { not: "trashed" };
    }

    if (search) {
      whereClause.OR = [
        { sourceUrl: { contains: search, mode: "insensitive" } },
        { destinationUrl: { contains: search, mode: "insensitive" } },
      ];
    }

    const [redirections, matchingCount, totalCount, activeCount, inactiveCount, trashedCount] = await Promise.all([
      prisma.redirection.findMany({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
        ...(isAll ? {} : { skip, take: limit }),
      }),
      prisma.redirection.count({ where: whereClause }),
      prisma.redirection.count({ where: { status: { not: "trashed" } } }),
      prisma.redirection.count({ where: { status: "active" } }),
      prisma.redirection.count({ where: { status: "inactive" } }),
      prisma.redirection.count({ where: { status: "trashed" } }),
    ]);

    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(matchingCount / limit));

    return NextResponse.json({
      redirections,
      totalCount: matchingCount,
      counts: {
        total: totalCount,
        published: activeCount,
        draft: inactiveCount,
        trashed: trashedCount,
      },
      pagination: {
        page: isAll ? 1 : page,
        limit: isAll ? matchingCount : limit,
        total: matchingCount,
        totalPages,
        hasMore: isAll ? false : skip + redirections.length < matchingCount,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch redirections:", error);
    return NextResponse.json(
      { error: "Failed to fetch redirections" },
      { status: 500 }
    );
  }
}

// POST /api/redirection - Create a new redirection with loop & chain checks
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const body = await request.json();
    const parsed = createRedirectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const sourceUrl = normalizeUrl(parsed.data.sourceUrl);
    const destinationUrl = normalizeUrl(parsed.data.destinationUrl);
    const statusCode = parsed.data.statusCode;

    // Edge Case 1: Self-Loop (sourceUrl === destinationUrl)
    if (sourceUrl.toLowerCase() === destinationUrl.toLowerCase()) {
      return NextResponse.json(
        { error: "Self-loop blocked: Source URL and Destination URL cannot be identical." },
        { status: 400 }
      );
    }

    // Edge Case 2: Existing Source URL
    const existingSource = await prisma.redirection.findUnique({
      where: { sourceUrl },
    });

    if (existingSource) {
      return NextResponse.json(
        { error: `A redirect for '${sourceUrl}' already exists.` },
        { status: 400 }
      );
    }

    // Edge Case 3: Circular Loop / Chain - Source URL is already a destination
    const sourceAsDestination = await prisma.redirection.findFirst({
      where: {
        destinationUrl: sourceUrl,
        status: { in: ["active", "inactive"] },
      },
    });

    if (sourceAsDestination) {
      return NextResponse.json(
        {
          error: `Chain loop blocked: '${sourceUrl}' is already set as a Destination URL for another redirect (${sourceAsDestination.sourceUrl} -> ${sourceUrl}).`,
        },
        { status: 400 }
      );
    }

    // Edge Case 4: Circular Loop / Chain - Destination URL is already a source
    const destinationAsSource = await prisma.redirection.findFirst({
      where: {
        sourceUrl: destinationUrl,
        status: { in: ["active", "inactive"] },
      },
    });

    if (destinationAsSource) {
      return NextResponse.json(
        {
          error: `Circular loop blocked: Destination '${destinationUrl}' is already configured as a Source URL for another redirect (${destinationUrl} -> ${destinationAsSource.destinationUrl}).`,
        },
        { status: 400 }
      );
    }

    // Create the redirection record
    const redirection = await prisma.redirection.create({
      data: {
        sourceUrl,
        destinationUrl,
        statusCode,
        status: "active",
      },
    });

    const clientMeta = await getClientAuditMeta(request);
    await recordAuditLog({
      eventType: "REDIRECTION.CREATED",
      category: "REDIRECTIONS",
      action: `Created ${statusCode} redirect: ${sourceUrl} ➔ ${destinationUrl}`,
      target: `Redirect: ${sourceUrl}`,
      userId: session.user.id,
      status: "SUCCESS",
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
      metadata: {
        sourceUrl,
        destinationUrl,
        statusCode,
        fromStatus: "new",
        toStatus: "active",
      },
    });

    // Sync to Redis Hash for main.ys Edge proxy middleware
    const { getRedisClient } = await import("@/lib/redis");
    const redis = getRedisClient();
    if (redis) {
      redis.hset("main:redirects", {
        [sourceUrl]: JSON.stringify({ destinationUrl, statusCode }),
      }).catch((e) => console.warn("[Redirects:Redis] Failed to sync redirect to Redis:", e));
    }

    return NextResponse.json(redirection, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create redirection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create redirection" },
      { status: 500 }
    );
  }
}
