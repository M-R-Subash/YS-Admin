import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// DELETE /api/account/sessions/[id] — Revoke a specific session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Resolve current session to prevent self-revocation
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const currentSessionId = session.sessionId || token?.sessionId;
    if (currentSessionId && id === currentSessionId) {
      return NextResponse.json(
        { error: "Cannot revoke the active current session. Use sign out instead." },
        { status: 400 }
      );
    }

    // Atomic ownership-scoped deletion in 1 query
    const result = await prisma.refreshToken.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Session not found or already revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}
