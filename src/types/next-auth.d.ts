import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    error?: string;
    sessionId?: string;
    sessionTokenHash?: string;
    user: {
      id: string;
      role: "ADMIN" | "EDITOR";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "EDITOR";
    userAgent?: string | null;
    ipAddress?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "EDITOR";
    sessionId?: string;
    refreshToken?: string;
    sessionTokenHash?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
