import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { blogQuickEditSchema } from "@/lib/schemas/seo-validation";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Validate request body
    const validatedData = blogQuickEditSchema.parse(body);
    
    const {
      title,
      slug,
      metaTitle,
      metaDesc,
      focusKeyword,
      canonicalUrl,
      noIndex,
      allowComments,
      authorId,
      authorName,
      authorRole,
      authorDescription,
    } = validatedData;
    
    // Update the blog and upsert SEO data
    const updatedBlog = await prisma.blog.update({
      where: { id },
      data: {
        title,
        slug,
        allowComments,
        // Update the blog's authorId if provided
        ...(authorId !== undefined && { authorId: authorId || null }),
        seo: {
          upsert: {
            create: {
              metaTitle,
              metaDesc,
              focusKeyword,
              canonicalUrl,
              noIndex,
              authorName,
              authorRole,
              authorDescription,
            },
            update: {
              metaTitle,
              metaDesc,
              focusKeyword,
              canonicalUrl,
              noIndex,
              authorName,
              authorRole,
              authorDescription,
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
