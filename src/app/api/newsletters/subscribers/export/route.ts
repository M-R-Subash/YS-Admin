import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        email: true,
        status: true,
        source: true,
        createdAt: true,
      },
    });

    // Generate CSV string
    const headers = ["Email", "Status", "Source", "Subscribed At"];
    const rows = subscribers.map((s) => [
      `"${s.email.replace(/"/g, '""')}"`,
      `"${s.status}"`,
      `"${s.source || "website"}"`,
      `"${s.createdAt.toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[API:Newsletters:Subscribers:Export] Error:", error);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
