import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { blogDraftSchema, blogPublishSchema } from "@/lib/schemas/blog/blog-validation";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (status === "trash") {
      whereClause.isTrashed = true;
    } else if (status === "published") {
      whereClause.status = "published";
      whereClause.isTrashed = false;
    } else if (status === "draft") {
      whereClause.status = "draft";
      whereClause.isTrashed = false;
    }

    // Exclude heavy TipTap rich-text `content` from list view for maximum speed & minimal payload
    const blogs = await prisma.blog.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        featuredImage: true,
        allowComments: true,
        status: true,
        isTrashed: true,
        excerpt: true,
        readingTime: true,
        tags: true,
        categories: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
            authorRole: true,
            description: true,
          },
        },
        seo: true,
        _count: {
          select: { 
            comments: {
              where: { isTrashed: false, parentId: null }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(blogs);
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch blogs", error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      title,
      slug,
      featuredImage,
      content,
      allowComments,
      status = "draft",
      tags = [],
      categories = [],
      readingTime = 0,
      excerpt = "",
      metaTitle = "",
      metaDesc = "",
      focusKeyword = "",
    } = body;

    // Validate with Zod based on status
    const validation = status === "published" 
      ? blogPublishSchema.safeParse(body) 
      : blogDraftSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          message: validation.error.issues[0]?.message || "Validation failed", 
          errors: validation.error.issues 
        },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const existingBlog = await prisma.blog.findUnique({
      where: { slug },
    });

    if (existingBlog) {
      return NextResponse.json(
        { message: "A blog with this slug already exists. Please choose a different title or edit the slug." },
        { status: 400 }
      );
    }

    const newBlog = await prisma.blog.create({
      data: {
        title,
        slug,
        featuredImage,
        content,
        excerpt,
        allowComments: allowComments ?? true,
        status: status || "draft",
        tags: tags || [],
        categories: categories || [],
        readingTime: readingTime || 0,
        publishedAt: status === "published" ? new Date() : null,
        authorId: session.user.id,
        seo: (metaTitle || metaDesc || focusKeyword) ? {
          create: {
            metaTitle: metaTitle || "",
            metaDesc: metaDesc || "",
            focusKeyword: focusKeyword || "",
          }
        } : undefined,
      },
      include: { seo: true },
    });

    if (newBlog.status === "published") {
      revalidateFrontendPath("/blogs");
      if (newBlog.slug) {
        revalidateFrontendPath(`/blogs/${newBlog.slug}`);
      }
    }

    return NextResponse.json(newBlog, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_BLOG_ERROR:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the blog.", error: error.message },
      { status: 500 }
    );
  }
}
