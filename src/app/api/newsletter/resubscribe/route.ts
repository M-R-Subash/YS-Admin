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
  const token = searchParams.get("token")?.trim();
  const target = token
    ? `${frontendUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}&resubscribe=true`
    : frontendUrl;

  return NextResponse.redirect(target, { status: 307 });
}

/**
 * POST: Internal sync API.
 * Pure JSON response — no UI or HTML in the admin panel.
 */
export async function POST(req: Request) {
  try {
    let token = "";
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      token = (formData.get("token") as string) || "";
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token || "";
    }

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    if (subscriber.status !== "active") {
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: "active" },
      });
    }

    return NextResponse.json({ success: true, message: "Re-subscribed successfully" });
  } catch (error) {
    console.error("[API:Admin:Newsletter:Resubscribe] Error:", error);
    return NextResponse.json({ error: "Failed to resubscribe" }, { status: 500 });
  }
}
