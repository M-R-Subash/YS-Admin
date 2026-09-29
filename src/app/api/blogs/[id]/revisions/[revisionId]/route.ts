import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/blogs/[id]/revisions/[revisionId] — Fetch full revision snapshot
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, revisionId } = await params;

    const revision = await prisma.blogRevision.findFirst({
      where: {
        id: revisionId,
        blogId: id,
      },
      include: {
        savedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!revision) {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ revision });
  } catch (error) {
    console.error("[API] GET /api/blogs/[id]/revisions/[revisionId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
