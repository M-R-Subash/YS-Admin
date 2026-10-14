import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateAggregateCaches } from "@/lib/server/memory-cache";
import { handleApiError } from "@/lib/server/prisma-errors";
import { z } from "zod";

const bulkSchema = z.object({
  emails: z
    .array(z.string().trim().email().toLowerCase())
    .min(1, "At least one valid email is required"),
  source: z.string().trim().optional().default("admin-bulk"),
});

/**
 * GET /api/newsletters/subscribers/bulk?ids=id1,id2,id3
 * Fetches selected subscribers for Spreadsheet Bulk Editor.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") || "";
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ subscribers: [] });
    }

    const subscribers = await prisma.subscriber.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscribers });
  } catch (error: any) {
    return handleApiError(error, "Failed to fetch subscribers for bulk edit");
  }
}

/**
 * PATCH /api/newsletters/subscribers/bulk
 * Commits multi-row spreadsheet edits in a single atomic transaction.
 */
export async function PATCH(request: Request) {
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
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No updates array provided" },
        { status: 400 }
      );
    }

    const batchUpdates = updates.slice(0, 100);

    // Validate email format and duplicate checks within submitted batch
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const submittedEmails = batchUpdates
      .map((u) => (u.changes?.email || u.changes?.title)?.trim().toLowerCase())
      .filter(Boolean);

    for (const email of submittedEmails) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: `Invalid email address format: "${email}".` },
          { status: 400 }
        );
      }
    }

    const uniqueEmails = new Set(submittedEmails);
    if (uniqueEmails.size !== submittedEmails.length) {
      return NextResponse.json(
        {
          error:
            "Duplicate emails detected within the bulk update list. Each email must be unique.",
        },
        { status: 400 }
      );
    }

    // Check against existing subscribers in DB that are not part of this update
    for (const update of batchUpdates) {
      const newEmail = (update.changes?.email || update.changes?.title)?.trim().toLowerCase();
      if (newEmail) {
        const conflict = await prisma.subscriber.findFirst({
          where: {
            email: newEmail,
            id: { not: update.id },
          },
          select: { id: true, email: true },
        });

        if (conflict) {
          return NextResponse.json(
            {
              error: `Email "${newEmail}" is already registered to another subscriber.`,
            },
            { status: 409 }
          );
        }
      }
    }

    // Execute atomic batch updates
    await prisma.$transaction(async (tx) => {
      for (const update of batchUpdates) {
        const { id, changes } = update;
        if (!changes || Object.keys(changes).length === 0) continue;

        const data: any = {};
        if (changes.email !== undefined) {
          data.email = String(changes.email).trim().toLowerCase();
        } else if (changes.title !== undefined) {
          data.email = String(changes.title).trim().toLowerCase();
        }
        if (changes.status !== undefined) {
          data.status = changes.status === "active" ? "active" : "unsubscribed";
        }
        if (changes.source !== undefined) {
          data.source = changes.source ? String(changes.source).trim() : null;
        }

        if (Object.keys(data).length > 0) {
          await tx.subscriber.update({
            where: { id },
            data,
          });
        }
      }
    });

    invalidateAggregateCaches();

    return NextResponse.json({
      success: true,
      updatedCount: batchUpdates.length,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to save bulk subscriber changes");
  }
}

/**
 * POST /api/newsletters/subscribers/bulk
 * Existing batch subscriber creation / import handler.
 */
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
