"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveFooterData(data: any) {
  try {
    await prisma.footer.upsert({
      where: { id: "global" },
      update: { content: data },
      create: { id: "global", content: data },
    });
    revalidatePath("/footer");
    return { success: true };
  } catch (error) {
    console.error("Failed to save footer:", error);
    return { success: false, error: "Failed to save footer" };
  }
}
