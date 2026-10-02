import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { parseUserAgent } from "@/lib/ua-parser";

// GET /api/account/sessions — Get all active logged-in devices/sessions for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read token from cookie for direct access to sessionId / sessionTokenHash
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const currentSessionId = session.sessionId || token?.sessionId;
    const currentTokenHash = session.sessionTokenHash || token?.sessionTokenHash;

    // Pure read-only query: active sessions for the authenticated user
    const rawSessions = await prisma.refreshToken.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Authoritative resolution of current session:
    // 1. Direct primary key match (sessionId)
    // 2. Token hash match (backward compatibility for sessions logged in before sessionId was introduced)
    let currentId = currentSessionId;
    if (!currentId && currentTokenHash) {
      currentId = rawSessions.find((s) => s.tokenHash === currentTokenHash)?.id;
    }

    const sessions = rawSessions.map((s) => ({
      id: s.id,
      device: parseUserAgent(s.userAgent),
      ipAddress: s.ipAddress || "Unknown IP",
      createdAt: s.createdAt.toISOString(),
      lastActive: s.updatedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: Boolean(currentId && s.id === currentId),
    }));

    // Pin current active session to top for optimal UX
    sessions.sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active sessions" },
      { status: 500 }
    );
  }
}

// POST /api/account/sessions — Actions like revoking all other sessions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const currentSessionId = session.sessionId || token?.sessionId;
    const currentTokenHash = session.sessionTokenHash || token?.sessionTokenHash;

    const body = await request.json().catch(() => ({}));

    if (body.action === "revoke_others") {
      // Deterministically resolve the current session to ensure it is never deleted
      let currentId = currentSessionId;
      if (!currentId && currentTokenHash) {
        const found = await prisma.refreshToken.findUnique({
          where: { tokenHash: currentTokenHash },
          select: { id: true, userId: true },
        });
        if (found && found.userId === session.user.id) {
          currentId = found.id;
        }
      }

      if (!currentId) {
        return NextResponse.json(
          { error: "Cannot identify current session. Please log in again." },
          { status: 400 }
        );
      }

      // Atomically delete all other sessions belonging to this user
      const result = await prisma.refreshToken.deleteMany({
        where: {
          userId: session.user.id,
          id: { not: currentId },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Revoked ${result.count} other session(s)`,
        revokedCount: result.count,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Revoke sessions error:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions" },
      { status: 500 }
    );
  }
}
