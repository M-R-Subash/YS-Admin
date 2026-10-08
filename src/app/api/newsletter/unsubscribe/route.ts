import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clientConfig } from "@/lib/config/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return new NextResponse(renderHtml("Invalid Request", "The unsubscribe link is missing an authentication token.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return new NextResponse(renderHtml("Token Not Found", "We could not find an active subscriber matching this link.", false), {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (subscriber.status !== "unsubscribed") {
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: "unsubscribed" },
      });
    }

    return new NextResponse(
      renderHtml(
        "Successfully Unsubscribed",
        `You have been removed from our newsletter list (<strong>${subscriber.email}</strong>). We're sorry to see you go!`,
        true,
        token
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("[API:Newsletter:Unsubscribe] Error:", error);
    return new NextResponse(renderHtml("Error", "An unexpected error occurred while processing your request.", false), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

// RFC 8058 One-Click Unsubscribe via HTTP POST (used by email clients like Gmail)
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

    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { status: "unsubscribed" },
    });

    return NextResponse.json({ success: true, message: "Unsubscribed successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function renderHtml(title: string, message: string, success: boolean, token?: string): string {
  const icon = success ? "✓" : "!";
  const iconBg = success ? "#10b981" : "#ef4444";
  const buttonHtml = success && token
    ? `
    <form method="POST" action="/api/newsletter/resubscribe" style="margin-top: 24px;">
      <input type="hidden" name="token" value="${token}" />
      <button type="submit" style="background-color: #374151; color: #ffffff; border: 1px solid #4b5563; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: background 0.2s;">
        Unsubscribed by mistake? Click to Re-subscribe
      </button>
    </form>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${clientConfig.app.name}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f17;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: ${iconBg};
      color: white;
      font-size: 28px;
      font-weight: bold;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 12px 0;
      color: #ffffff;
    }
    p {
      color: #9ca3af;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    a.home-link {
      color: #f59e0b;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
    }
    a.home-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${buttonHtml}
    <div style="margin-top: 28px; border-top: 1px solid #1f2937; padding-top: 20px;">
      <a href="${clientConfig.app.frontendUrl}" class="home-link">&larr; Return to ${clientConfig.app.name}</a>
    </div>
  </div>
</body>
</html>
  `;
}
