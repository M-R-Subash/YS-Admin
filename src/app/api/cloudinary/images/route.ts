import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: Request) {
  try {
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
