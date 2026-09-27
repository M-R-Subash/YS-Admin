import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import { serverConfig } from "@/lib/config/server";

cloudinary.config({
  cloud_name: serverConfig.cloudinary.cloudName,
  api_key: serverConfig.cloudinary.apiKey,
  api_secret: serverConfig.cloudinary.apiSecret,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveAdmin(session.user.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { public_id } = await request.json();
    if (!public_id) {
      return NextResponse.json({ error: "Missing public_id" }, { status: 400 });
    }
    const result = await cloudinary.uploader.destroy(public_id);
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Cloudinary delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
