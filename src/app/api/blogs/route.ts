import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidateFrontendPath } from "@/lib/revalidate";
import {
  blogDraftSchema,
  blogPublishSchema,
  blogScheduleSchema,
} from "@/lib/schemas/blog/blog-validation";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

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
    } else if (status === "scheduled") {
      whereClause.status = "scheduled";
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
        scheduledAt: true,
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
      ogImage = "",
      ogTitle = "",
      ogDesc = "",
      canonicalUrl = "",
      noIndex = false,
      scheduledAt = null,
    } = body;

    // Validate with Zod based on status
    const validation =
      status === "published"
        ? blogPublishSchema.safeParse(body)
        : status === "scheduled"
        ? blogScheduleSchema.safeParse(body)
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

    let parsedScheduledAt: Date | null = null;
    let finalStatus = status || "draft";
    let finalPublishedAt: Date | null = null;

    if (status === "published") {
      finalPublishedAt = new Date();
    } else if (status === "scheduled" && scheduledAt) {
      const scheduleDate = new Date(scheduledAt);
      if (!isNaN(scheduleDate.getTime())) {
        // Edge case: If scheduled time is already in the past, publish immediately
        if (scheduleDate.getTime() <= Date.now()) {
          finalStatus = "published";
          finalPublishedAt = new Date();
        } else {
          parsedScheduledAt = scheduleDate;
        }
      }
    }

    const newBlog = await prisma.blog.create({
      data: {
        title,
        slug,
        featuredImage,
        content,
        excerpt,
        allowComments: allowComments ?? true,
        status: finalStatus,
        tags: tags || [],
        categories: categories || [],
        readingTime: readingTime || 0,
        publishedAt: finalPublishedAt,
        scheduledAt: parsedScheduledAt,
        authorId: session.user.id,
        seo: (metaTitle || metaDesc || focusKeyword || ogImage || ogTitle || ogDesc || canonicalUrl || noIndex) ? {
          create: {
            metaTitle: metaTitle || "",
            metaDesc: metaDesc || "",
            focusKeyword: focusKeyword || "",
            ogImage: ogImage || "",
            ogTitle: ogTitle || "",
            ogDesc: ogDesc || "",
            canonicalUrl: canonicalUrl || "",
            noIndex: Boolean(noIndex),
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
