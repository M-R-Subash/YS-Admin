import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, generateRawToken, hashToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { parseUserAgent } from "@/lib/ua-parser";

// GET /api/account/sessions — Get all active logged-in devices/sessions for the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let currentTokenHash = (session as any).sessionTokenHash;

    let rawSessions = await prisma.refreshToken.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Enforce max 3 active sessions: prune excess if any exist
    if (rawSessions.length > 3) {
      const excess = rawSessions.slice(3);
      await prisma.refreshToken.deleteMany({
        where: { id: { in: excess.map((s) => s.id) } },
      }).catch(() => {});
      rawSessions = rawSessions.slice(0, 3);
    }

    // Self-healing: If user logged in before the RefreshToken table was created,
    // automatically register their current device on the fly!
    if (rawSessions.length === 0) {
      const userAgent = request.headers.get("user-agent") || null;
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        null;

      const rawRefreshToken = generateRawToken();
      const tokenHash = hashToken(rawRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const created = await prisma.refreshToken.create({
        data: {
          tokenHash,
          userId: session.user.id,
          userAgent,
          ipAddress,
          expiresAt,
        },
      });

      rawSessions = [created];
      currentTokenHash = tokenHash;
    }

    const sessions = rawSessions.map((s) => ({
      id: s.id,
      device: parseUserAgent(s.userAgent),
      ipAddress: s.ipAddress || "Unknown IP",
      createdAt: s.createdAt.toISOString(),
      lastActive: s.updatedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: currentTokenHash ? s.tokenHash === currentTokenHash : false,
    }));

    // If none matched current explicitly, mark the most recently active one as current
    if (sessions.length > 0 && !sessions.some((s) => s.isCurrent)) {
      sessions[0].isCurrent = true;
    }

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active sessions", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/account/sessions — Actions like revoking all other sessions
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const currentTokenHash = (session as any).sessionTokenHash;

    if (body.action === "revoke_others") {
      const deleteFilter: any = {
        userId: session.user.id,
      };

      if (currentTokenHash) {
        deleteFilter.tokenHash = { not: currentTokenHash };
      }

      const result = await prisma.refreshToken.deleteMany({
        where: deleteFilter,
      });

      return NextResponse.json({
        success: true,
        message: `Revoked ${result.count} other session(s)`,
        revokedCount: result.count,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Revoke sessions error:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions", details: error.message },
      { status: 500 }
    );
  }
}
