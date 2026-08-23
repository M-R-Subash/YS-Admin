import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { seoQuickEditSchema } from "@/lib/schemas/seo-validation";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Validate request body
    const validatedData = seoQuickEditSchema.parse(body);
    
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
      noIndex
    } = validatedData;
    
    // Convert structuredData string to JSON if present
    let parsedStructuredData = null;
    if (structuredData) {
      parsedStructuredData = JSON.parse(structuredData);
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
              metaTitle,
              metaDesc,
              focusKeyword,
              ogImage,
              ogTitle,
              ogDesc,
              canonicalUrl,
              structuredData: parsedStructuredData as any,
              noIndex
            },
            update: {
              metaTitle,
              metaDesc,
              focusKeyword,
              ogImage,
              ogTitle,
              ogDesc,
              canonicalUrl,
              structuredData: parsedStructuredData as any,
              noIndex
            }
          }
        }
      },
      include: {
        seo: true
      }
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
