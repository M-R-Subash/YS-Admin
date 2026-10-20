import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { recordAuditLog, getClientAuditMeta } from "@/lib/server/audit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user.id);
    if (!guard.authorized || !guard.user) {
      return NextResponse.json({ message: guard.error || "Forbidden" }, { status: guard.status });
    }

    const isAdmin = guard.user.role === "ADMIN";

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        description: true,
        authorRole: true,
        ...(isAdmin && {
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              blogs: true,
              pages: true,
            },
          },
        }),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveAdmin(session.user.id);
    if (!guard.authorized) {
      return NextResponse.json({ message: guard.error }, { status: guard.status });
    }

    const { email, name, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Email, password, and role are required" },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);
    const cleanRole = String(role).toUpperCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Validate password complexity: minimum 8 characters, at least one letter and one number
    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (!/[A-Za-z]/.test(cleanPassword) || !/[0-9]/.test(cleanPassword)) {
      return NextResponse.json(
        { message: "Password must contain both letters and numbers" },
        { status: 400 }
      );
    }

    // Validate role
    if (cleanRole !== "ADMIN" && cleanRole !== "EDITOR") {
      return NextResponse.json(
        { message: "Role must be either ADMIN or EDITOR" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    const clientMeta = await getClientAuditMeta(request);
    await recordAuditLog({
      eventType: "USER.CREATED",
      category: "USERS",
      action: `Created new team member account for "${newUser.name || newUser.email}" (${newUser.role})`,
      target: `User: ${newUser.name || newUser.email}`,
      userId: session.user.id,
      status: "SUCCESS",
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
      metadata: {
        newUserId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
