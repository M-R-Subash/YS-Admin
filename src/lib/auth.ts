import { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { serverConfig } from "@/lib/config/server";

const ACCESS_TOKEN_LIFETIME_MS = serverConfig.auth.jwt.accessExpiryMs;
const REFRESH_TOKEN_LIFETIME_MS = serverConfig.auth.jwt.refreshExpiryMs;
const MAX_ACTIVE_SESSIONS_PER_USER = 3; // Enforce maximum 3 active devices/sessions per user

/**
 * Safeguard 3: Hash refresh tokens before saving in database.
 * The client only holds the raw token in their encrypted session;
 * the DB only ever stores the irreversible SHA-256 hash.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

/**
 * Safeguard 1: Handle concurrent refresh requests (Race Condition Lock).
 * When multiple requests trigger a refresh simultaneously, they share the same
 * in-flight promise rather than colliding in the database or invalidating each other.
 */
const refreshLocks = new Map<string, Promise<JWT>>();

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken || !token.id) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  const oldRawToken = token.refreshToken;
  const oldHash = hashToken(oldRawToken);

  // If a refresh is already in flight for this exact token, await and reuse it
  if (refreshLocks.has(oldHash)) {
    return refreshLocks.get(oldHash)!;
  }

  const refreshPromise = (async () => {
    try {
      // 1. Verify the user still exists in the live database
      const liveUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { id: true, role: true, profilePicture: true, name: true },
      });

      if (!liveUser) {
        // User was deleted! Invalidate immediately.
        await prisma.refreshToken.deleteMany({
          where: { userId: token.id },
        }).catch(() => {});
        return { ...token, error: "RefreshAccessTokenError" };
      }

      // 2. Look up the refresh token in PostgreSQL by sessionId or SHA-256 hash
      let existingToken = token.sessionId
        ? await prisma.refreshToken.findUnique({ where: { id: token.sessionId } })
        : await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });

      // Self-heal: If tokenHash or sessionId desynced, recover active session for this user
      if (!existingToken) {
        existingToken = await prisma.refreshToken.findFirst({
          where: {
            userId: liveUser.id,
            expiresAt: { gt: new Date() },
          },
          orderBy: { updatedAt: "desc" },
        });

        if (existingToken) {
          await prisma.refreshToken.update({
            where: { id: existingToken.id },
            data: { tokenHash: oldHash },
          }).catch((err) => console.error("Session re-link error:", err));
        }
      }

      if (!existingToken || existingToken.expiresAt < new Date()) {
        // Token doesn't exist or has expired beyond the sliding window
        return { ...token, error: "RefreshAccessTokenError" };
      }

      // 3. Extend sliding window by 7 days
      const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

      // 4. Update the token in DB and extend the sliding window (updating updatedAt to reflect activity)
      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: existingToken.id },
          data: {
            tokenHash: oldHash,
            expiresAt: newExpiresAt,
          },
        }),
        // Safeguard 2: Clean up dead/expired tokens for this user to prevent table bloat
        prisma.refreshToken.deleteMany({
          where: {
            userId: liveUser.id,
            expiresAt: { lt: new Date() },
          },
        }),
      ]);

      return {
        ...token,
        role: liveUser.role, // Live role update if changed in DB!
        picture: liveUser.profilePicture || token.picture,
        name: liveUser.name || token.name,
        sessionId: existingToken.id,
        refreshToken: oldRawToken,
        sessionTokenHash: oldHash,
        accessTokenExpires: Date.now() + ACCESS_TOKEN_LIFETIME_MS,
        error: undefined,
      };
    } catch (error) {
      console.error("NextAuth token refresh error:", error);
      return { ...token, error: "RefreshAccessTokenError" };
    } finally {
      // Keep lock cached for 5 seconds to absorb closely grouped in-flight concurrent calls
      setTimeout(() => {
        refreshLocks.delete(oldHash);
      }, 5000);
    }
  })();

  refreshLocks.set(oldHash, refreshPromise);
  return refreshPromise;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Incorrect email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Incorrect email or password");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        const userAgent = (req?.headers as any)?.["user-agent"] || null;
        const ipAddress =
          ((req?.headers as any)?.["x-forwarded-for"] as string)
            ?.split(",")[0]
            ?.trim() ||
          (req?.headers as any)?.["x-real-ip"] ||
          null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "ADMIN" | "EDITOR",
          image: user.profilePicture,
          userAgent,
          ipAddress,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: Generate initial access & refresh tokens
      if (user) {
        const rawRefreshToken = generateRawToken();
        const tokenHash = hashToken(rawRefreshToken);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

        // Safeguard 2: Clean up dead/expired tokens for this user on login
        await prisma.refreshToken.deleteMany({
          where: {
            userId: user.id,
            expiresAt: { lt: new Date() },
          },
        }).catch(() => {});

        // Enforce Max Active Sessions (e.g. 3 devices max):
        // If user already has 3 or more active sessions, automatically prune the oldest to make room for the new login.
        const existingSessions = await prisma.refreshToken.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        }).catch(() => []);

        if (existingSessions.length >= MAX_ACTIVE_SESSIONS_PER_USER) {
          const sessionsToDelete = existingSessions.slice(MAX_ACTIVE_SESSIONS_PER_USER - 1);
          await prisma.refreshToken.deleteMany({
            where: { id: { in: sessionsToDelete.map((s) => s.id) } },
          }).catch(() => {});
        }

        const userAgent = user.userAgent || null;
        const ipAddress = user.ipAddress || null;

        // Save new hashed refresh token in DB with device metadata
        const createdSession = await prisma.refreshToken.create({
          data: {
            tokenHash,
            userId: user.id,
            userAgent,
            ipAddress,
            expiresAt,
          },
        });

        token.id = user.id;
        token.role = user.role;
        token.picture = user.image;
        token.sessionId = createdSession.id;
        token.refreshToken = rawRefreshToken;
        token.sessionTokenHash = tokenHash;
        token.accessTokenExpires = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
        return token;
      }

      // Handling useSession().update() calls from the client (safe fields only)
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image) token.picture = session.image;
      }

      // If legacy session without refreshToken, allow normal access without creating phantom DB rows.
      // (Full refresh token lifecycle is established on login via CredentialsProvider authorize)
      if (!token.refreshToken && token.id) {
        return token;
      }

      // Check if access token is still fresh (with 10-second buffer for clock skew)
      // If valid, return directly with 0 database queries!
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 10000) {
        return token;
      }

      // Access token has expired -> trigger sliding refresh
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.image = token.picture;
        session.sessionId = token.sessionId;
        session.sessionTokenHash = token.sessionTokenHash;
        if (token.error) {
          session.error = token.error;
        }
      }
      return session;
    }
  },
  events: {
    async signOut({ token }) {
      // Explicit user sign out: instantly delete their refresh token from DB
      try {
        if (token?.sessionId) {
          await prisma.refreshToken.deleteMany({
            where: { id: token.sessionId },
          });
        } else if (token?.refreshToken) {
          const hash = hashToken(token.refreshToken as string);
          await prisma.refreshToken.deleteMany({
            where: { tokenHash: hash },
          });
        }
      } catch (err) {
        console.error("SignOut session delete error:", err);
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: serverConfig.auth.maxAge,
  },
  secret: serverConfig.auth.nextAuthSecret,
};

/**
 * Live Database Write-Guard:
 * Checks the live PostgreSQL database to ensure the user still exists
 * and holds the ADMIN role. Prevents deleted or demoted users from executing
 * destructive actions even if their 15-minute access token has not yet expired.
 */
export async function requireLiveAdmin(userId?: string): Promise<{
  authorized: boolean;
  status: number;
  error?: string;
}> {
  if (!userId) {
    return { authorized: false, status: 401, error: "Unauthorized" };
  }

  const liveUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!liveUser) {
    return {
      authorized: false,
      status: 403,
      error: "Unauthorized: Account no longer exists or has been deleted",
    };
  }

  if (liveUser.role !== "ADMIN") {
    return {
      authorized: false,
      status: 403,
      error: "Forbidden: Administrator permissions required",
    };
  }

  return { authorized: true, status: 200 };
}
