"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveHeaderData(data: any) {
  try {
    await prisma.header.upsert({
      where: { id: "global" },
      update: { content: data },
      create: { id: "global", content: data },
    });
    revalidatePath("/header");
    return { success: true };
  } catch (error) {
    console.error("Failed to save header:", error);
    return { success: false, error: "Failed to save header" };
  }
}
