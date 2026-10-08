import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTestEmail } from "@/lib/newsletter/batch-engine";
import { z } from "zod";

const testEmailSchema = z.object({
  recipientEmail: z.string().trim().email("Invalid recipient email").optional(),
  subject: z.string().trim().min(1, "Subject is required"),
  bodyHtml: z.string().trim().min(1, "Body content is required"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = testEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    const targetEmail = parsed.data.recipientEmail || session.user?.email || "subash@ysinnovations.com";

    const res = await sendTestEmail(targetEmail, parsed.data.subject, parsed.data.bodyHtml);

    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to send test email" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email preview sent to ${targetEmail}`,
    });
  } catch (error: any) {
    console.error("[API:Newsletters:Test] Error:", error);
    return NextResponse.json({ error: "Failed to dispatch test email" }, { status: 500 });
  }
}
