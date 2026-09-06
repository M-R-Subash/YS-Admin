"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidateFrontendPath } from "@/lib/revalidate";

export async function saveHeaderData(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: "Unauthorized access" };
    }

    await prisma.header.upsert({
      where: { id: "global" },
      update: { content: data },
      create: { id: "global", content: data },
    });
    revalidatePath("/header");
    revalidateFrontendPath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to save header:", error);
    return { success: false, error: "Failed to save header" };
  }
}
