import { NextResponse } from "next/server";
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

const createRedirectionSchema = z.object({
  sourceUrl: z.string().min(1, "Source URL is required"),
  destinationUrl: z.string().min(1, "Destination URL is required"),
  statusCode: z.number().int().refine((val) => val === 301 || val === 302, {
    message: "Status code must be 301 or 302",
  }),
});

// GET /api/redirection - List all redirections
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("status"); // "active" | "inactive" | "trashed" | "all"

    let whereClause: any = {};
    if (filter && filter !== "all") {
      whereClause.status = filter;
    }

    const redirections = await prisma.redirection.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(redirections);
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

    return NextResponse.json(redirection, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create redirection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create redirection" },
      { status: 500 }
    );
  }
}
