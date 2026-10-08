import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address").toLowerCase(),
  source: z.string().trim().max(50).optional().default("website"),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    // Rate limit: max 5 subscribe attempts per hour per IP
    const limit = rateLimit("newsletter-subscribe", ip, {
      windowMs: 60 * 60 * 1000,
      max: 5,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many subscription attempts from this IP. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    const { email, source } = parsed.data;

    // Upsert: If existing and unsubscribed, re-activate!
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
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to YS Innovations updates!",
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
      },
    });
  } catch (error: any) {
    console.error("[API:Newsletter:Subscribe] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your subscription." },
      { status: 500 }
    );
  }
}
