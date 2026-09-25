import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { universalSeoFormSchema } from "@/lib/schemas/seo-validation";
import { revalidateFrontendPath } from "@/lib/revalidate";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    
    // Validate request body
    const validatedData = universalSeoFormSchema.parse(body);
    
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
      allowComments,
      authorId,
      authorName,
      authorRole,
      authorDescription,
    } = validatedData;

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
    
    // Update the blog and upsert SEO data
    const updatedBlog = await prisma.blog.update({
      where: { id },
      data: {
        title,
        slug,
        ...(allowComments !== undefined && { allowComments }),
        // Update the blog's authorId if provided
        ...(authorId !== undefined && { authorId: authorId || null }),
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
        seo: true,
        author: {
          select: {
            id: true,
            name: true,
            description: true,
            authorRole: true,
            profilePicture: true,
          }
        }
      }
    });
    
    if (updatedBlog.slug) {
      revalidateFrontendPath(`/blogs/${updatedBlog.slug}`);
      revalidateFrontendPath("/blogs");
    }

    return NextResponse.json({ success: true, blog: updatedBlog });
    
  } catch (error) {
    console.error("[BLOG_SEO_UPDATE_ERROR]", error);
    
    // Handle Prisma Unique Constraint Error (e.g. slug already exists)
    if ((error as any).code === "P2002") {
      return new NextResponse("That slug is already taken.", { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal Error", details: String(error) },
      { status: 500 }
    );
  }
}
