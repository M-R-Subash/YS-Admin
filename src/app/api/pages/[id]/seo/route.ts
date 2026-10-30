import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { universalSeoFormSchema } from "@/lib/schemas/seo-validation";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { logEntityMutation } from "@/lib/server/audit";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    
    // Validate request body with universal SEO schema
    const validatedData = universalSeoFormSchema.parse(body);

    const existingPage = await prisma.page.findUnique({
      where: { id },
      include: { seo: true },
    });

    if (!existingPage) {
      return new NextResponse("Page not found", { status: 404 });
    }
    
    const {
      title,
      slug,
      metaTitle,
      metaDesc,
      focusKeyword,
      ogImage,
      ogTitle,
      ogDesc,
      canonicalUrl,
      structuredData,
      noIndex,
      authorName,
      authorRole,
      authorDescription,
    } = validatedData;

    if (existingPage.slug === "/" && slug !== "/") {
      return new NextResponse("The Homepage slug is protected and cannot be changed.", { status: 400 });
    }
    
    // Convert structuredData string to JSON if present
    let parsedStructuredData = null;
    if (structuredData) {
      if (typeof structuredData === "string") {
        try {
          parsedStructuredData = JSON.parse(structuredData);
        } catch {
          parsedStructuredData = null;
        }
      } else {
        parsedStructuredData = structuredData;
      }
    }
    
    // Update the page and upsert SEO data
    const updatedPage = await prisma.page.update({
      where: { id },
      data: {
        title,
        slug,
        seo: {
          upsert: {
            create: {
              metaTitle: metaTitle || null,
              metaDesc: metaDesc || null,
              focusKeyword: focusKeyword || null,
              ogImage: ogImage || null,
              ogTitle: ogTitle || null,
              ogDesc: ogDesc || null,
              canonicalUrl: canonicalUrl || null,
              structuredData: parsedStructuredData as any,
              noIndex: Boolean(noIndex),
              authorName: authorName || null,
              authorRole: authorRole || null,
              authorDescription: authorDescription || null,
            },
            update: {
              metaTitle: metaTitle || null,
              metaDesc: metaDesc || null,
              focusKeyword: focusKeyword || null,
              ogImage: ogImage || null,
              ogTitle: ogTitle || null,
              ogDesc: ogDesc || null,
              canonicalUrl: canonicalUrl || null,
              structuredData: parsedStructuredData as any,
              noIndex: Boolean(noIndex),
              authorName: authorName || null,
              authorRole: authorRole || null,
              authorDescription: authorDescription || null,
            }
          }
        }
      },
      include: {
        seo: true
      }
    });
    
    if (updatedPage.slug) {
      revalidateFrontendPath(updatedPage.slug);
    }

    await logEntityMutation({
      category: "PAGES",
      before: existingPage,
      after: updatedPage,
      userId: session.user.id,
      request: req,
    });

    return NextResponse.json({ success: true, page: updatedPage });
    
  } catch (error) {
    console.error("[SEO_UPDATE_ERROR]", error);
    
    // Handle Prisma Unique Constraint Error (e.g. slug already exists)
    if ((error as any).code === "P2002") {
      return new NextResponse("That slug is already taken.", { status: 400 });
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
}
