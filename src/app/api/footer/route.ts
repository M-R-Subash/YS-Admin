import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/footer — Returns the global footer configuration
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const footer = await prisma.footer.findUnique({
      where: { id: "global" },
    });

    if (!footer) {
      return NextResponse.json(
        { error: "Global footer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(footer.content);
  } catch (error) {
    console.error("Error fetching footer:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
