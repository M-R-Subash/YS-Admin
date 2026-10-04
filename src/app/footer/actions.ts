"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { footerZodSchema } from "@/lib/schemas/footer/footer-validation";

export async function saveFooterData(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: "Unauthorized access" };
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return { success: false, error: guard.error || "Forbidden access" };
    }

    const parsed = footerZodSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed for footer data",
      };
    }

    await prisma.footer.upsert({
      where: { id: "global" },
      update: { content: parsed.data },
      create: { id: "global", content: parsed.data },
    });

    revalidatePath("/footer");
    revalidateFrontendPath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to save footer:", error);
    return { success: false, error: "Failed to save footer" };
  }
}
