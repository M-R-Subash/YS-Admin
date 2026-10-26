"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
import { revalidateFrontendPath, revalidateFrontendTag } from "@/lib/revalidate";
import { headerZodSchema } from "@/lib/schemas/header/header-validation";
import { recordAuditLog, getClientAuditMeta } from "@/lib/server/audit";

export async function saveHeaderData(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: "Unauthorized access" };
    }

    const guard = await requireLiveAdmin(session.user?.id);
    if (!guard.authorized) {
      return { success: false, error: guard.error || "Forbidden access" };
    }

    const parsed = headerZodSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed for header data",
      };
    }

    await prisma.header.upsert({
      where: { id: "global" },
      update: { content: parsed.data },
      create: { id: "global", content: parsed.data },
    });

    revalidatePath("/header");
    await Promise.all([
      revalidateFrontendPath("/", "layout"),
      revalidateFrontendTag("global-header"),
    ]);

    const clientMeta = await getClientAuditMeta();
    await recordAuditLog({
      eventType: "SETTINGS.HEADER_UPDATED",
      category: "SETTINGS",
      action: "Updated global site header navigation & styling",
      target: "Header Configuration",
      userId: session.user.id,
      status: "SUCCESS",
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
      metadata: {
        keys: Object.keys(parsed.data || {}),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save header:", error);
    return { success: false, error: "Failed to save header" };
  }
}
