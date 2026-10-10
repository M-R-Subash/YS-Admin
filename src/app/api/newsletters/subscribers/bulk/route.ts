import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const bulkSchema = z.object({
  emails: z.array(z.string().trim().email().toLowerCase()).min(1, "At least one valid email is required"),
  source: z.string().trim().optional().default("admin-bulk"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email list provided" },
        { status: 400 }
      );
    }

    const { emails, source } = parsed.data;
    const uniqueEmails = Array.from(new Set(emails));

    // Batch insert with skipDuplicates
    const created = await prisma.subscriber.createMany({
      data: uniqueEmails.map((email) => ({
        email,
        source,
        status: "active",
      })),
      skipDuplicates: true,
    });

    // For any existing subscribers that were unsubscribed, re-activate and record return metadata
    const reactivated = await prisma.subscriber.updateMany({
      where: {
        email: { in: uniqueEmails },
        status: "unsubscribed",
      },
      data: {
        status: "active",
        resubscribedAt: new Date(),
        resubscribeCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      count: created.count,
      reactivatedCount: reactivated.count,
      totalProcessed: uniqueEmails.length,
      message: `Successfully processed ${uniqueEmails.length} subscriber(s). Added ${created.count} new, reactivated ${reactivated.count}.`,
    });
  } catch (error: any) {
    console.error("[API:Newsletters:Subscribers:Bulk] Error:", error);
    return NextResponse.json({ error: "Failed to process bulk subscribers" }, { status: 500 });
  }
}
