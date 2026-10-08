import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { status: "active" },
    });

    return new NextResponse(
      `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Re-subscribed - YS Innovations</title>
  <style>
    body {
      margin: 0; padding: 0; background-color: #0b0f17; color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
    }
    .card {
      background-color: #111827; border: 1px solid #1f2937; border-radius: 16px;
      padding: 40px; max-width: 480px; width: 90%; text-align: center;
    }
    .icon { width: 56px; height: 56px; border-radius: 50%; background-color: #10b981; color: white; font-size: 28px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1 style="margin: 0 0 12px 0;">Welcome Back!</h1>
    <p style="color: #9ca3af; font-size: 15px; line-height: 1.6;">You have been successfully re-subscribed to YS Innovations newsletter updates.</p>
    <div style="margin-top: 24px;">
      <a href="https://ysinnovations.com" style="color: #f59e0b; text-decoration: none; font-weight: 600;">&larr; Return to YS Innovations</a>
    </div>
  </div>
</body>
</html>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to resubscribe" }, { status: 500 });
  }
}
