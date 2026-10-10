import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clientConfig } from "@/lib/config/client";

/**
 * GET: If a visitor lands on the admin URL, immediately redirect them
 * to the customer-facing main website. Users never see the admin panel.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const frontendUrl = clientConfig.app.frontendUrl.replace(/\/$/, "");
  const target = searchParams.toString()
    ? `${frontendUrl}/api/newsletter/unsubscribe?${searchParams.toString()}`
    : frontendUrl;

  return NextResponse.redirect(target, { status: 307 });
}

/**
 * POST: Internal sync API or RFC 8058 One-Click unsubscribe.
 * Pure JSON response — no UI or HTML in the admin panel.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    if (subscriber.status !== "unsubscribed") {
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: "unsubscribed" },
      });
    }

    return NextResponse.json({ success: true, message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("[API:Admin:Newsletter:Unsubscribe] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
