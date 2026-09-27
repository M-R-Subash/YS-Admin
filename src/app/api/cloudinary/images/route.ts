import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import { serverConfig } from "@/lib/config/server";

cloudinary.config({
  cloud_name: serverConfig.cloudinary.cloudName,
  api_key: serverConfig.cloudinary.apiKey,
  api_secret: serverConfig.cloudinary.apiSecret,
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nextCursor = searchParams.get("next_cursor");
    
    const result = await cloudinary.search
      .expression("resource_type:image")
      .sort_by("created_at", "desc")
      .max_results(24)
      .next_cursor(nextCursor || undefined)
      .execute();
      
    return NextResponse.json({
      images: result.resources,
      next_cursor: result.next_cursor,
    });
  } catch (error: any) {
    console.error("Cloudinary fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
