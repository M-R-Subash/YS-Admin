import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
import { sendTestEmail } from "@/lib/newsletter/batch-engine";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const testEmailSchema = z.object({
  recipientEmail: z.string().trim().email("Invalid recipient email").optional(),
  subject: z.string().trim().min(1, "Subject is required"),
  bodyHtml: z.string().trim().min(1, "Body content is required"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require live ADMIN role to prevent unauthorized users/editors from triggering relay
    const guard = await requireLiveAdmin(session.user.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    // Rate limit: max 10 test emails per hour per admin user
    const rl = await rateLimit("newsletter-test", session.user.id, {
      windowMs: 60 * 60 * 1000,
      max: 10,
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Test email rate limit exceeded. Please wait an hour before requesting more test deliveries." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = testEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    // Restrict test email recipient strictly to the authenticated admin's own email (SEC-006)
    const adminEmail = session.user.email;
    if (!adminEmail) {
      return NextResponse.json({ error: "Admin session has no valid email address" }, { status: 400 });
    }

    if (
      parsed.data.recipientEmail &&
      parsed.data.recipientEmail.toLowerCase() !== adminEmail.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "For security, test emails can only be dispatched to your own authenticated admin email address." },
        { status: 403 }
      );
    }

    const res = await sendTestEmail(adminEmail, parsed.data.subject, parsed.data.bodyHtml);

    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to send test email" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email preview sent to ${adminEmail}`,
    });
  } catch (error: any) {
    console.error("[API:Newsletters:Test] Error:", error);
    return NextResponse.json({ error: "Failed to dispatch test email" }, { status: 500 });
  }
}
