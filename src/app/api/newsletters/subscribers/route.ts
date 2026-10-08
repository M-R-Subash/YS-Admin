import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSubscriberSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  source: z.string().trim().optional().default("admin"),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.email = { contains: search, mode: "insensitive" };
    }
    if (status === "active" || status === "unsubscribed") {
      where.status = status;
    }

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.subscriber.count({ where }),
    ]);

    return NextResponse.json({
      subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API:Newsletters:Subscribers:GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createSubscriberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { email, source } = parsed.data;

    const subscriber = await prisma.subscriber.upsert({
      where: { email },
      update: {
        status: "active",
        source,
      },
      create: {
        email,
        source,
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscriber ${subscriber.email} saved successfully`,
      subscriber,
    });
  } catch (error: any) {
    console.error("[API:Newsletters:Subscribers:POST] Error:", error);
    return NextResponse.json({ error: "Failed to create subscriber" }, { status: 500 });
  }
}
