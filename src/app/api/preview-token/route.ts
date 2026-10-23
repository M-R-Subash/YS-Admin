import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, requireLiveUser } from "@/lib/auth";
import { serverConfig } from "@/lib/config/server";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || "";

    // Generate a short-lived HMAC token valid for 15 minutes (900 seconds)
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const secretKey = serverConfig.security.previewSecret;

    if (!secretKey) {
      return NextResponse.json({ error: "Preview secret not configured" }, { status: 500 });
    }

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(`${slug}:${expiresAt}`)
      .digest("hex");

    const previewToken = `${expiresAt}.${signature}`;

    return NextResponse.json({
      token: previewToken,
      expiresAt,
    });
  } catch (error: any) {
    console.error("[PreviewToken:GET] Error generating preview token:", error);
    return NextResponse.json({ error: "Failed to generate preview token" }, { status: 500 });
  }
}
