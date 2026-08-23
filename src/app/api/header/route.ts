import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/header — Returns the global header configuration
export async function GET() {
  try {
    const header = await prisma.header.findUnique({
      where: { id: "global" },
    });

    if (!header) {
      return NextResponse.json(
        { error: "Global header not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(header.content);
  } catch (error) {
    console.error("Error fetching header:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
