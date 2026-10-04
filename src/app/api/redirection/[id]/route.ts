import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

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

const updateRedirectionSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  statusCode: z.number().int().refine((val) => val === 301 || val === 302, {
    message: "Status code must be 301 or 302",
  }).optional(),
  destinationUrl: z.string().trim().min(1, "Destination URL cannot be empty").max(500).optional(),
});

// PATCH /api/redirection/[id] - Update status or edit fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { id } = await params;
    const body = await request.json();

    const parsed = updateRedirectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const existing = await prisma.redirection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Redirection not found" },
        { status: 404 }
      );
    }

    const updateData: {
      status?: string;
      statusCode?: number;
      destinationUrl?: string;
    } = {};

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }

    if (parsed.data.statusCode !== undefined) {
      updateData.statusCode = parsed.data.statusCode;
    }

    if (parsed.data.destinationUrl !== undefined) {
      const normalizedDest = normalizeUrl(parsed.data.destinationUrl);
      if (existing.sourceUrl.toLowerCase() === normalizedDest.toLowerCase()) {
        return NextResponse.json(
          { error: "Self-loop blocked: Destination URL cannot be identical to Source URL." },
          { status: 400 }
        );
      }
      updateData.destinationUrl = normalizedDest;
    }

    const updated = await prisma.redirection.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update redirection:", error);
    return NextResponse.json(
      { error: "Failed to update redirection" },
      { status: 500 }
    );
  }
}

// DELETE /api/redirection/[id] - Permanently delete redirection record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { id } = await params;

    await prisma.redirection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete redirection:", error);
    return NextResponse.json(
      { error: "Failed to delete redirection" },
      { status: 500 }
    );
  }
}
