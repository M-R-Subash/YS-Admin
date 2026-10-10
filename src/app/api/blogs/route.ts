import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { slugify } from "@/lib/slugify";
import {
  blogDraftSchema,
  blogPublishSchema,
  blogScheduleSchema,
  extractImageUrl,
} from "@/lib/schemas/blog/blog-validation";
import { handleApiError } from "@/lib/server/prisma-errors";
import { createBlogRevisionSnapshot } from "@/lib/server/revision-utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

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

    if (category && category !== "all") {
      whereClause.categories = { has: category };
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
        authorId: true,
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

    const guard = await requireLiveUser(session.user.id);
    if (!guard.authorized) {
      return NextResponse.json(
        { message: guard.error },
        { status: guard.status }
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

    const cleanCategories = Array.isArray(categories)
      ? categories.map((c: any) => String(c).trim()).filter(Boolean)
      : [];
    for (const catName of cleanCategories) {
      await prisma.category.upsert({
        where: { name: catName },
        update: {},
        create: { name: catName, slug: slugify(catName) || "category" },
      });
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t: any) => String(t).trim()).filter(Boolean)
      : [];
    for (const tagName of cleanTags) {
      await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName, slug: slugify(tagName) || "tag" },
      });
    }

    const newBlog = await prisma.blog.create({
      data: {
        title,
        slug,
        featuredImage: extractImageUrl(featuredImage),
        content,
        excerpt,
        allowComments: allowComments ?? true,
        status: finalStatus,
        tags: cleanTags,
        categories: cleanCategories,
        categoryItems: {
          connect: cleanCategories.map((name: string) => ({ name })),
        },
        tagItems: {
          connect: cleanTags.map((name: string) => ({ name })),
        },
        readingTime: readingTime || 0,
        publishedAt: finalPublishedAt,
        scheduledAt: parsedScheduledAt,
        notifyNewsletter: Boolean(body.sendNewsletter),
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
      try {
        await createBlogRevisionSnapshot({
          blogId: newBlog.id,
          payload: {
            title: newBlog.title,
            slug: newBlog.slug,
            content: newBlog.content,
            excerpt: newBlog.excerpt,
            featuredImage: newBlog.featuredImage,
            allowComments: newBlog.allowComments,
            readingTime: newBlog.readingTime,
            tags: newBlog.tags,
            categories: newBlog.categories,
            faqs: (newBlog.content as any)?.faqs || [],
            seo: newBlog.seo,
          },
          action: "published",
          savedById: session.user.id,
        });
      } catch (revErr) {
        console.error("[BlogRevision] Initial snapshot creation error:", revErr);
      }

      revalidateFrontendPath("/blogs");
      if (newBlog.slug) {
        revalidateFrontendPath(`/blogs/${newBlog.slug}`);
      }

      // Trigger newsletter dispatch only if explicitly opted in
      if (body.sendNewsletter === true) {
        import("@/lib/newsletter/batch-engine")
          .then(({ dispatchBlogNewsletter }) => dispatchBlogNewsletter(newBlog.id))
          .catch((nlErr) => {
            console.error("[Newsletter:Dispatch] Error:", nlErr);
          });
      }
    }

    return NextResponse.json(newBlog, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, "An error occurred while creating the blog.");
  }
}
