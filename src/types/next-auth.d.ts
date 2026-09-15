import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    error?: string;
    user: {
      id: string;
      role: "ADMIN" | "EDITOR";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "EDITOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "EDITOR";
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
