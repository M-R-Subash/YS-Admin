import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    
    // In Prisma, we don't have isTrashed field on Blog currently.
    // If we need it, we should add it, but for now we'll just filter by status.

    const blogs = await prisma.blog.findMany({
      include: { 
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
          select: { comments: true }
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
      status,
      tags,
      categories,
      readingTime,
    } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { message: "Missing required fields (Title, Slug, Content)." },
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
        allowComments: allowComments ?? true,
        status: status || "draft",
        tags: tags || [],
        categories: categories || [],
        readingTime: readingTime || 0,
        publishedAt: status === "published" ? new Date() : null,
        authorId: session.user.id,
      },
    });

    return NextResponse.json(newBlog, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_BLOG_ERROR:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the blog.", error: error.message },
      { status: 500 }
    );
  }
}
